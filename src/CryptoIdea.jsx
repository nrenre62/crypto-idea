/**
 * Crypto Idea - Crypto Portfolio & DCA Calculator
 * Version: 1.6.0
 * Build: 2026-04-04
 * Author: Crypto Idea Team
 * License: Proprietary
 * 
 * Changelog:
 *   v1.5.0 (2026-04-05) - Auto-fill historical price when selecting buy date
 *   v1.4.0 (2026-04-04) - Portfolio shows holdings value as big number, fixed delete button
 *   v1.3.0 (2026-04-04) - Live/Offline status indicator with glowing dot
 *   v1.2.0 (2026-04-04) - Full historical price data for 40+ coins, monthly timestamps
 *   v1.1.0 (2026-04-04) - Independent DCA calculator, real historical prices
 *   v1.0.2 (2026-04-04) - Embedded top 80 coins with icons and history
 *   v1.0.1 (2026-04-04) - Fixed search for sandbox, datetime with seconds
 *   v1.0.0 (2026-04-04) - Initial release: portfolio, search, DCA, price tracking
 */
import { useState, useEffect, useCallback, useMemo } from "react";

// Firebase Authentication — passwords are handled by Firebase and never stored on the device.
import { registerUser, loginUser, logoutUser, resetPassword, onAuthChange } from "./api/firebase-auth.js";
import { httpsCallable } from "firebase/functions";
import { functions } from "./api/firebase.config.js";
import {
  getPortfolios, getCoins,
  createPortfolio as dbCreatePortfolio,
  deletePortfolio as dbDeletePortfolio,
  addCoin as dbAddCoin,
  removeCoin as dbRemoveCoin,
  addTransaction as dbAddTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from "./api/firebase-database.js";
import { fetchPrices, searchCoins } from "./api/coingecko.js";
import { fetchSiteConfig } from "./api/config.js";
import { fmtP, fmtMc, fmtPct, uid, fmtDT, timeBetween } from "./utils/format.js";
// NOTE: the admin dashboard is a SEPARATE app (admin.html / admin-main.jsx) served
// at /admin — its code is intentionally NOT imported here, so the user bundle never
// contains admin functionality.

// ═══ Persistent Storage Helpers ═══
const db = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, value) {
    try { await window.storage.set(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  async del(key) {
    try { await window.storage.delete(key); return true; }
    catch { return false; }
  }
};

const APP_NAME = "Crypto Idea";
const APP_VERSION = "4.1.0";

// Admin is determined by a Firebase custom claim ({ admin: true }) set server-side
// via the Admin SDK — see functions/index.js (setAdminClaim) and functions/scripts/set-admin.js.
// There is intentionally no email allowlist here; the client only reads the verified token claim.
const FREE_COIN_LIMIT = 10;
const MAX_COINS = 200;

const TOP_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png", rank: 1, mockPrice: 84000, mockChange: 2.4, mockMcap: 1367e9, launch: "2013-04-28" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", thumb: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png", rank: 2, mockPrice: 1900, mockChange: 1.8, mockMcap: 423e9, launch: "2015-08-07" },
  { id: "tether", symbol: "USDT", name: "Tether", thumb: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png", rank: 3, mockPrice: 1.00, mockChange: 0.01, mockMcap: 112e9, launch: "2015-02-25" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", thumb: "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png", rank: 4, mockPrice: 598, mockChange: -0.5, mockMcap: 89e9, launch: "2017-07-25" },
  { id: "solana", symbol: "SOL", name: "Solana", thumb: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png", rank: 5, mockPrice: 125, mockChange: 3.2, mockMcap: 78e9, launch: "2020-04-10" },
  { id: "ripple", symbol: "XRP", name: "XRP", thumb: "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png", rank: 6, mockPrice: 2.18, mockChange: 1.1, mockMcap: 56e9, launch: "2013-08-04" },
  { id: "usd-coin", symbol: "USDC", name: "USDC", thumb: "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png", rank: 7, mockPrice: 1.00, mockChange: 0.0, mockMcap: 34e9, launch: "2018-10-08" },
  { id: "staked-ether", symbol: "STETH", name: "Lido Staked Ether", thumb: "https://assets.coingecko.com/coins/images/13442/thumb/steth_logo.png", rank: 8, mockPrice: 1900, mockChange: 1.7, mockMcap: 32e9, launch: "2020-12-18" },
  { id: "cardano", symbol: "ADA", name: "Cardano", thumb: "https://assets.coingecko.com/coins/images/975/thumb/cardano.png", rank: 9, mockPrice: 0.72, mockChange: -1.2, mockMcap: 25.6e9, launch: "2017-10-01" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", thumb: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png", rank: 10, mockPrice: 0.165, mockChange: 4.1, mockMcap: 23.7e9, launch: "2013-12-15" },
  { id: "tron", symbol: "TRX", name: "TRON", thumb: "https://assets.coingecko.com/coins/images/1094/thumb/tron-logo.png", rank: 11, mockPrice: 0.125, mockChange: 0.3, mockMcap: 10.9e9, launch: "2017-09-13" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", thumb: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png", rank: 12, mockPrice: 38.5, mockChange: -2.1, mockMcap: 15.2e9, launch: "2020-09-22" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", thumb: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png", rank: 13, mockPrice: 18.2, mockChange: 1.5, mockMcap: 10.7e9, launch: "2017-09-20" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", thumb: "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png", rank: 14, mockPrice: 7.85, mockChange: -0.8, mockMcap: 10.5e9, launch: "2020-08-19" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin", thumb: "https://assets.coingecko.com/coins/images/17980/thumb/ton_symbol.png", rank: 15, mockPrice: 5.92, mockChange: 0.6, mockMcap: 10.3e9, launch: "2021-08-26" },
  { id: "matic-network", symbol: "POL", name: "Polygon", thumb: "https://assets.coingecko.com/coins/images/4713/thumb/polygon.png", rank: 16, mockPrice: 0.72, mockChange: 2.3, mockMcap: 6.7e9, launch: "2019-04-28" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", thumb: "https://assets.coingecko.com/coins/images/11939/thumb/shiba.png", rank: 17, mockPrice: 0.0000245, mockChange: 5.2, mockMcap: 14.4e9, launch: "2020-08-01" },
  { id: "dai", symbol: "DAI", name: "Dai", thumb: "https://assets.coingecko.com/coins/images/9956/thumb/Badge_Dai.png", rank: 18, mockPrice: 1.00, mockChange: 0.0, mockMcap: 5.3e9, launch: "2019-11-18" },
  { id: "wrapped-bitcoin", symbol: "WBTC", name: "Wrapped Bitcoin", thumb: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png", rank: 19, mockPrice: 84000, mockChange: 2.3, mockMcap: 11.2e9, launch: "2019-01-30" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", thumb: "https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg", rank: 20, mockPrice: 12.4, mockChange: 3.7, mockMcap: 7.4e9, launch: "2020-09-17" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", thumb: "https://assets.coingecko.com/coins/images/2/thumb/litecoin.png", rank: 21, mockPrice: 84, mockChange: 0.9, mockMcap: 6.3e9, launch: "2013-04-28" },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", thumb: "https://assets.coingecko.com/coins/images/780/thumb/bitcoin-cash-circle.png", rank: 22, mockPrice: 485, mockChange: 1.4, mockMcap: 9.5e9, launch: "2017-07-23" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", thumb: "https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png", rank: 23, mockPrice: 9.15, mockChange: -1.6, mockMcap: 3.5e9, launch: "2019-03-14" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", thumb: "https://assets.coingecko.com/coins/images/10365/thumb/near.jpg", rank: 24, mockPrice: 7.25, mockChange: 4.5, mockMcap: 7.8e9, launch: "2020-10-14" },
  { id: "stellar", symbol: "XLM", name: "Stellar", thumb: "https://assets.coingecko.com/coins/images/100/thumb/Stellar_symbol_black_RGB.png", rank: 25, mockPrice: 0.118, mockChange: 0.4, mockMcap: 3.4e9, launch: "2014-08-05" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer", thumb: "https://assets.coingecko.com/coins/images/14495/thumb/Internet_Computer_logo.png", rank: 26, mockPrice: 12.8, mockChange: -0.3, mockMcap: 5.9e9, launch: "2021-05-10" },
  { id: "monero", symbol: "XMR", name: "Monero", thumb: "https://assets.coingecko.com/coins/images/69/thumb/monero_logo.png", rank: 27, mockPrice: 178, mockChange: 1.2, mockMcap: 3.2e9, launch: "2014-05-21" },
  { id: "aptos", symbol: "APT", name: "Aptos", thumb: "https://assets.coingecko.com/coins/images/26455/thumb/aptos_round.png", rank: 28, mockPrice: 9.35, mockChange: 2.8, mockMcap: 4.3e9, launch: "2022-10-19" },
  { id: "ethereum-classic", symbol: "ETC", name: "Ethereum Classic", thumb: "https://assets.coingecko.com/coins/images/453/thumb/ethereum-classic-logo.png", rank: 29, mockPrice: 27.4, mockChange: -0.7, mockMcap: 3.9e9, launch: "2016-07-24" },
  { id: "filecoin", symbol: "FIL", name: "Filecoin", thumb: "https://assets.coingecko.com/coins/images/12817/thumb/filecoin.png", rank: 30, mockPrice: 5.85, mockChange: 1.9, mockMcap: 3.2e9, launch: "2020-10-15" },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera", thumb: "https://assets.coingecko.com/coins/images/3688/thumb/hbar.png", rank: 31, mockPrice: 0.112, mockChange: 3.3, mockMcap: 4e9, launch: "2019-09-17" },
  { id: "lido-dao", symbol: "LDO", name: "Lido DAO", thumb: "https://assets.coingecko.com/coins/images/18834/thumb/LDO.png", rank: 32, mockPrice: 2.15, mockChange: -2.4, mockMcap: 1.9e9, launch: "2021-08-20" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", thumb: "https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg", rank: 33, mockPrice: 1.18, mockChange: 2.1, mockMcap: 3.1e9, launch: "2023-03-23" },
  { id: "optimism", symbol: "OP", name: "Optimism", thumb: "https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png", rank: 34, mockPrice: 2.65, mockChange: 1.3, mockMcap: 2.8e9, launch: "2022-06-01" },
  { id: "vechain", symbol: "VET", name: "VeChain", thumb: "https://assets.coingecko.com/coins/images/1167/thumb/VeChain-Logo-768x725.png", rank: 35, mockPrice: 0.038, mockChange: -1.5, mockMcap: 2.7e9, launch: "2017-08-22" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective", thumb: "https://assets.coingecko.com/coins/images/12882/thumb/Secondary_Symbol.png", rank: 36, mockPrice: 26.8, mockChange: 4.2, mockMcap: 2.5e9, launch: "2020-10-21" },
  { id: "kaspa", symbol: "KAS", name: "Kaspa", thumb: "https://assets.coingecko.com/coins/images/25751/thumb/kaspa-icon-exchanges.png", rank: 37, mockPrice: 0.145, mockChange: 6.1, mockMcap: 3.5e9, launch: "2022-06-08" },
  { id: "celestia", symbol: "TIA", name: "Celestia", thumb: "https://assets.coingecko.com/coins/images/31967/thumb/tia.jpg", rank: 38, mockPrice: 11.2, mockChange: 3.8, mockMcap: 2.3e9, launch: "2023-10-31" },
  { id: "render-token", symbol: "RNDR", name: "Render", thumb: "https://assets.coingecko.com/coins/images/11636/thumb/rndr.png", rank: 39, mockPrice: 9.85, mockChange: 5.4, mockMcap: 3.8e9, launch: "2020-06-11" },
  { id: "immutable-x", symbol: "IMX", name: "Immutable", thumb: "https://assets.coingecko.com/coins/images/17233/thumb/immutableX-symbol-BLK-RGB.png", rank: 40, mockPrice: 2.35, mockChange: 1.7, mockMcap: 3.1e9, launch: "2021-11-12" },
  { id: "sei-network", symbol: "SEI", name: "Sei", thumb: "https://assets.coingecko.com/coins/images/28205/thumb/Sei_Logo.png", rank: 41, mockPrice: 0.62, mockChange: 2.9, mockMcap: 1.8e9, launch: "2023-08-15" },
  { id: "sui", symbol: "SUI", name: "Sui", thumb: "https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg", rank: 42, mockPrice: 1.85, mockChange: 7.2, mockMcap: 2.4e9, launch: "2023-05-03" },
  { id: "the-graph", symbol: "GRT", name: "The Graph", thumb: "https://assets.coingecko.com/coins/images/13397/thumb/Graph_Token.png", rank: 43, mockPrice: 0.295, mockChange: 1.8, mockMcap: 2.8e9, launch: "2020-12-17" },
  { id: "algorand", symbol: "ALGO", name: "Algorand", thumb: "https://assets.coingecko.com/coins/images/4380/thumb/download.png", rank: 44, mockPrice: 0.215, mockChange: -0.9, mockMcap: 1.7e9, launch: "2019-06-20" },
  { id: "aave", symbol: "AAVE", name: "Aave", thumb: "https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png", rank: 45, mockPrice: 105, mockChange: 2.6, mockMcap: 1.5e9, launch: "2020-10-02" },
  { id: "fantom", symbol: "FTM", name: "Fantom", thumb: "https://assets.coingecko.com/coins/images/4001/thumb/Fantom_round.png", rank: 46, mockPrice: 0.78, mockChange: 3.1, mockMcap: 2.2e9, launch: "2018-10-29" },
  { id: "theta-token", symbol: "THETA", name: "Theta Network", thumb: "https://assets.coingecko.com/coins/images/2538/thumb/theta-token-logo.png", rank: 47, mockPrice: 2.15, mockChange: -1.8, mockMcap: 2.1e9, launch: "2018-01-17" },
  { id: "maker", symbol: "MKR", name: "Maker", thumb: "https://assets.coingecko.com/coins/images/1364/thumb/Mark_Maker.png", rank: 48, mockPrice: 2850, mockChange: 0.5, mockMcap: 2.6e9, launch: "2017-01-29" },
  { id: "thorchain", symbol: "RUNE", name: "THORChain", thumb: "https://assets.coingecko.com/coins/images/6595/thumb/Rune200x200.png", rank: 49, mockPrice: 5.42, mockChange: 2.2, mockMcap: 1.8e9, launch: "2019-07-23" },
  { id: "fetch-ai", symbol: "FET", name: "Fetch.ai", thumb: "https://assets.coingecko.com/coins/images/5681/thumb/Fetch.jpg", rank: 50, mockPrice: 2.35, mockChange: 8.1, mockMcap: 2e9, launch: "2019-02-28" },
  { id: "flow", symbol: "FLOW", name: "Flow", thumb: "https://assets.coingecko.com/coins/images/13446/thumb/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png", rank: 51, mockPrice: 0.95, mockChange: -0.6, mockMcap: 1.4e9, launch: "2021-01-27" },
  { id: "axie-infinity", symbol: "AXS", name: "Axie Infinity", thumb: "https://assets.coingecko.com/coins/images/13029/thumb/axie_infinity_logo.png", rank: 52, mockPrice: 8.15, mockChange: 1.4, mockMcap: 1.2e9, launch: "2020-11-04" },
  { id: "decentraland", symbol: "MANA", name: "Decentraland", thumb: "https://assets.coingecko.com/coins/images/878/thumb/decentraland-mana.png", rank: 53, mockPrice: 0.52, mockChange: 2.9, mockMcap: 980e6, launch: "2017-09-17" },
  { id: "the-sandbox", symbol: "SAND", name: "The Sandbox", thumb: "https://assets.coingecko.com/coins/images/12129/thumb/sandbox_logo.jpg", rank: 54, mockPrice: 0.48, mockChange: 3.5, mockMcap: 1.1e9, launch: "2020-08-14" },
  { id: "gala", symbol: "GALA", name: "Gala", thumb: "https://assets.coingecko.com/coins/images/12493/thumb/GALA-COINGECKO.png", rank: 55, mockPrice: 0.042, mockChange: 4.8, mockMcap: 1.5e9, launch: "2020-09-16" },
  { id: "eos", symbol: "EOS", name: "EOS", thumb: "https://assets.coingecko.com/coins/images/738/thumb/eos-eos-logo.png", rank: 56, mockPrice: 0.82, mockChange: -0.3, mockMcap: 920e6, launch: "2017-07-01" },
  { id: "kucoin-shares", symbol: "KCS", name: "KuCoin Token", thumb: "https://assets.coingecko.com/coins/images/1047/thumb/sa9z79.png", rank: 57, mockPrice: 10.5, mockChange: 0.8, mockMcap: 1e9, launch: "2017-10-24" },
  { id: "neo", symbol: "NEO", name: "NEO", thumb: "https://assets.coingecko.com/coins/images/480/thumb/NEO_512_512.png", rank: 58, mockPrice: 12.3, mockChange: -1.1, mockMcap: 870e6, launch: "2016-09-09" },
  { id: "quant-network", symbol: "QNT", name: "Quant", thumb: "https://assets.coingecko.com/coins/images/3370/thumb/5ZOu7brX_400x400.jpg", rank: 59, mockPrice: 98, mockChange: 1.9, mockMcap: 1.2e9, launch: "2018-08-10" },
  { id: "elrond-erd-2", symbol: "EGLD", name: "MultiversX", thumb: "https://assets.coingecko.com/coins/images/12335/thumb/egld-token-logo.png", rank: 60, mockPrice: 42, mockChange: -2.3, mockMcap: 1.1e9, launch: "2020-09-04" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor", thumb: "https://assets.coingecko.com/coins/images/28452/thumb/ARUsPeNQ_400x400.jpeg", rank: 61, mockPrice: 520, mockChange: 5.6, mockMcap: 3.6e9, launch: "2023-03-06" },
  { id: "worldcoin-wld", symbol: "WLD", name: "Worldcoin", thumb: "https://assets.coingecko.com/coins/images/31069/thumb/worldcoin.jpeg", rank: 62, mockPrice: 4.85, mockChange: 3.4, mockMcap: 1.5e9, launch: "2023-07-24" },
  { id: "pepe", symbol: "PEPE", name: "Pepe", thumb: "https://assets.coingecko.com/coins/images/29850/thumb/pepe-token.jpeg", rank: 63, mockPrice: 0.0000118, mockChange: 9.2, mockMcap: 5e9, launch: "2023-04-18" },
  { id: "bonk", symbol: "BONK", name: "Bonk", thumb: "https://assets.coingecko.com/coins/images/28600/thumb/bonk.jpg", rank: 64, mockPrice: 0.0000285, mockChange: 6.7, mockMcap: 1.9e9, launch: "2022-12-30" },
  { id: "floki", symbol: "FLOKI", name: "FLOKI", thumb: "https://assets.coingecko.com/coins/images/16746/thumb/PNG_image.png", rank: 65, mockPrice: 0.000225, mockChange: 5.3, mockMcap: 2.2e9, launch: "2021-07-10" },
  { id: "okb", symbol: "OKB", name: "OKB", thumb: "https://assets.coingecko.com/coins/images/4463/thumb/WeChat_Image_20220118095654.png", rank: 66, mockPrice: 48, mockChange: 0.2, mockMcap: 2.9e9, launch: "2019-04-16" },
  { id: "stacks", symbol: "STX", name: "Stacks", thumb: "https://assets.coingecko.com/coins/images/2069/thumb/Stacks_logo_full.png", rank: 67, mockPrice: 2.85, mockChange: 4.1, mockMcap: 4.1e9, launch: "2019-10-28" },
  { id: "mantle", symbol: "MNT", name: "Mantle", thumb: "https://assets.coingecko.com/coins/images/30980/thumb/token-logo.png", rank: 68, mockPrice: 0.78, mockChange: 1.6, mockMcap: 2.5e9, launch: "2023-07-17" },
  { id: "pendle", symbol: "PENDLE", name: "Pendle", thumb: "https://assets.coingecko.com/coins/images/15069/thumb/Pendle_Logo_Normal-03.png", rank: 69, mockPrice: 5.2, mockChange: 3.9, mockMcap: 820e6, launch: "2021-04-29" },
  { id: "ondo-finance", symbol: "ONDO", name: "Ondo Finance", thumb: "https://assets.coingecko.com/coins/images/26580/thumb/ONDO.png", rank: 70, mockPrice: 1.42, mockChange: 4.7, mockMcap: 2e9, launch: "2024-01-18" },
  { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter", thumb: "https://assets.coingecko.com/coins/images/34188/thumb/jup.png", rank: 71, mockPrice: 1.15, mockChange: 2.8, mockMcap: 1.6e9, launch: "2024-01-31" },
  { id: "arweave", symbol: "AR", name: "Arweave", thumb: "https://assets.coingecko.com/coins/images/4343/thumb/oRt6SiEN_400x400.jpg", rank: 72, mockPrice: 28, mockChange: 4.3, mockMcap: 1.8e9, launch: "2019-11-08" },
  { id: "helium", symbol: "HNT", name: "Helium", thumb: "https://assets.coingecko.com/coins/images/4284/thumb/Helium_HNT.png", rank: 73, mockPrice: 8.5, mockChange: 2.7, mockMcap: 1.4e9, launch: "2020-06-07" },
  { id: "aave", symbol: "AAVE", name: "Aave", thumb: "https://assets.coingecko.com/coins/images/12645/thumb/AAVE.png", rank: 74, mockPrice: 105, mockChange: 2.6, mockMcap: 1.5e9, launch: "2020-10-02" },
  { id: "iota", symbol: "IOTA", name: "IOTA", thumb: "https://assets.coingecko.com/coins/images/692/thumb/IOTA_Swirl.png", rank: 75, mockPrice: 0.32, mockChange: -0.8, mockMcap: 890e6, launch: "2017-06-13" },
  { id: "tezos", symbol: "XTZ", name: "Tezos", thumb: "https://assets.coingecko.com/coins/images/976/thumb/Tezos-logo.png", rank: 76, mockPrice: 1.05, mockChange: -1.2, mockMcap: 1e9, launch: "2018-06-25" },
  { id: "synthetix-network-token", symbol: "SNX", name: "Synthetix", thumb: "https://assets.coingecko.com/coins/images/3406/thumb/SNX.png", rank: 77, mockPrice: 3.25, mockChange: 1.5, mockMcap: 1.1e9, launch: "2018-03-12" },
  { id: "curve-dao-token", symbol: "CRV", name: "Curve DAO", thumb: "https://assets.coingecko.com/coins/images/12124/thumb/Curve.png", rank: 78, mockPrice: 0.58, mockChange: 3.4, mockMcap: 720e6, launch: "2020-08-14" },
  { id: "compound-governance-token", symbol: "COMP", name: "Compound", thumb: "https://assets.coingecko.com/coins/images/10775/thumb/COMP.png", rank: 79, mockPrice: 62, mockChange: 0.8, mockMcap: 530e6, launch: "2020-06-16" },
  { id: "chiliz", symbol: "CHZ", name: "Chiliz", thumb: "https://assets.coingecko.com/coins/images/8834/thumb/CHZ_Token_updated.png", rank: 80, mockPrice: 0.095, mockChange: 1.1, mockMcap: 840e6, launch: "2019-07-01" },
];


// Complete monthly historical price data for all coins
// Format: [year, month, price_usd]
// Sources: Known historical prices from market data through early 2025

const PRICE_HISTORY = {
  "bitcoin": [[2013,4,135],[2013,5,120],[2013,6,100],[2013,7,95],[2013,8,110],[2013,9,130],[2013,10,195],[2013,11,700],[2013,12,946],
    [2014,1,800],[2014,2,600],[2014,3,475],[2014,4,450],[2014,5,500],[2014,6,630],[2014,7,580],[2014,8,500],[2014,9,400],[2014,10,340],[2014,11,370],[2014,12,310],
    [2015,1,215],[2015,2,235],[2015,3,240],[2015,4,235],[2015,5,240],[2015,6,250],[2015,7,285],[2015,8,225],[2015,9,235],[2015,10,270],[2015,11,330],[2015,12,430],
    [2016,1,380],[2016,2,430],[2016,3,415],[2016,4,430],[2016,5,450],[2016,6,670],[2016,7,650],[2016,8,575],[2016,9,610],[2016,10,695],[2016,11,740],[2016,12,960],
    [2017,1,970],[2017,2,1050],[2017,3,1190],[2017,4,1350],[2017,5,2300],[2017,6,2500],[2017,7,2800],[2017,8,4300],[2017,9,3800],[2017,10,6100],[2017,11,9800],[2017,12,14000],
    [2018,1,13500],[2018,2,10200],[2018,3,7000],[2018,4,7500],[2018,5,7400],[2018,6,6200],[2018,7,7600],[2018,8,6900],[2018,9,6500],[2018,10,6300],[2018,11,4300],[2018,12,3700],
    [2019,1,3500],[2019,2,3400],[2019,3,4000],[2019,4,5300],[2019,5,8500],[2019,6,11800],[2019,7,9800],[2019,8,9600],[2019,9,8300],[2019,10,9200],[2019,11,7550],[2019,12,7200],
    [2020,1,8500],[2020,2,8800],[2020,3,5200],[2020,4,6800],[2020,5,9500],[2020,6,9100],[2020,7,11100],[2020,8,11700],[2020,9,10800],[2020,10,13300],[2020,11,19700],[2020,12,29000],
    [2021,1,33000],[2021,2,45000],[2021,3,58000],[2021,4,57000],[2021,5,37000],[2021,6,35000],[2021,7,41000],[2021,8,47000],[2021,9,43000],[2021,10,61000],[2021,11,57000],[2021,12,46000],
    [2022,1,38000],[2022,2,39000],[2022,3,44000],[2022,4,38000],[2022,5,31000],[2022,6,19900],[2022,7,23300],[2022,8,20000],[2022,9,19400],[2022,10,20500],[2022,11,16500],[2022,12,16500],
    [2023,1,23000],[2023,2,23500],[2023,3,28000],[2023,4,29200],[2023,5,27200],[2023,6,30400],[2023,7,29200],[2023,8,26000],[2023,9,26900],[2023,10,34500],[2023,11,37700],[2023,12,42500],
    [2024,1,42000],[2024,2,52000],[2024,3,71000],[2024,4,64000],[2024,5,67500],[2024,6,61400],[2024,7,66800],[2024,8,58000],[2024,9,63500],[2024,10,72000],[2024,11,96000],[2024,12,93500],
    [2025,1,94000],[2025,2,84000],[2025,3,82500],[2025,4,84000]],

  "ethereum": [[2015,8,1.2],[2015,9,1.0],[2015,10,0.8],[2015,11,0.9],[2015,12,0.9],
    [2016,1,1.0],[2016,2,4.5],[2016,3,11],[2016,4,8],[2016,5,12],[2016,6,14],[2016,7,11],[2016,8,12],[2016,9,12],[2016,10,10],[2016,11,9.5],[2016,12,8],
    [2017,1,10],[2017,2,13],[2017,3,50],[2017,4,72],[2017,5,170],[2017,6,300],[2017,7,220],[2017,8,300],[2017,9,300],[2017,10,300],[2017,11,470],[2017,12,750],
    [2018,1,1100],[2018,2,860],[2018,3,530],[2018,4,670],[2018,5,690],[2018,6,450],[2018,7,440],[2018,8,280],[2018,9,230],[2018,10,200],[2018,11,120],[2018,12,130],
    [2019,1,110],[2019,2,120],[2019,3,140],[2019,4,165],[2019,5,265],[2019,6,270],[2019,7,210],[2019,8,185],[2019,9,175],[2019,10,185],[2019,11,150],[2019,12,130],
    [2020,1,170],[2020,2,225],[2020,3,110],[2020,4,175],[2020,5,210],[2020,6,230],[2020,7,230],[2020,8,390],[2020,9,360],[2020,10,395],[2020,11,470],[2020,12,740],
    [2021,1,1300],[2021,2,1900],[2021,3,1800],[2021,4,2800],[2021,5,2500],[2021,6,2250],[2021,7,2300],[2021,8,3200],[2021,9,3000],[2021,10,4300],[2021,11,4600],[2021,12,3800],
    [2022,1,2800],[2022,2,2700],[2022,3,3300],[2022,4,2800],[2022,5,1900],[2022,6,1050],[2022,7,1600],[2022,8,1550],[2022,9,1300],[2022,10,1300],[2022,11,1200],[2022,12,1200],
    [2023,1,1550],[2023,2,1600],[2023,3,1800],[2023,4,1900],[2023,5,1850],[2023,6,1850],[2023,7,1900],[2023,8,1700],[2023,9,1650],[2023,10,1800],[2023,11,2050],[2023,12,2350],
    [2024,1,2280],[2024,2,2900],[2024,3,3500],[2024,4,3200],[2024,5,3100],[2024,6,3400],[2024,7,3200],[2024,8,2500],[2024,9,2500],[2024,10,2700],[2024,11,3600],[2024,12,3400],
    [2025,1,3300],[2025,2,2700],[2025,3,2100],[2025,4,1900]],

  "binancecoin": [[2017,8,1.5],[2017,9,1.1],[2017,10,1.5],[2017,11,2.2],[2017,12,8.5],
    [2018,1,24],[2018,2,11],[2018,3,12],[2018,4,15],[2018,5,14],[2018,6,14],[2018,7,10],[2018,8,10],[2018,9,10],[2018,10,9],[2018,11,6],[2018,12,5.5],
    [2019,1,6],[2019,2,9],[2019,3,15],[2019,4,22],[2019,5,30],[2019,6,36],[2019,7,28],[2019,8,26],[2019,9,18],[2019,10,18],[2019,11,16],[2019,12,14],
    [2020,1,17],[2020,2,21],[2020,3,12],[2020,4,16],[2020,5,17],[2020,6,16],[2020,7,19],[2020,8,22],[2020,9,27],[2020,10,30],[2020,11,30],[2020,12,37],
    [2021,1,44],[2021,2,140],[2021,3,265],[2021,4,530],[2021,5,350],[2021,6,310],[2021,7,320],[2021,8,460],[2021,9,410],[2021,10,460],[2021,11,620],[2021,12,530],
    [2022,1,400],[2022,2,390],[2022,3,400],[2022,4,385],[2022,5,310],[2022,6,215],[2022,7,245],[2022,8,280],[2022,9,275],[2022,10,290],[2022,11,295],[2022,12,245],
    [2023,1,310],[2023,2,310],[2023,3,310],[2023,4,310],[2023,5,305],[2023,6,240],[2023,7,242],[2023,8,220],[2023,9,215],[2023,10,225],[2023,11,240],[2023,12,310],
    [2024,1,305],[2024,2,365],[2024,3,565],[2024,4,580],[2024,5,590],[2024,6,590],[2024,7,575],[2024,8,520],[2024,9,560],[2024,10,590],[2024,11,635],[2024,12,710],
    [2025,1,690],[2025,2,620],[2025,3,600],[2025,4,598]],

  "solana": [[2020,5,0.8],[2020,6,0.7],[2020,7,1.5],[2020,8,3.5],[2020,9,2.5],[2020,10,1.5],[2020,11,2.0],[2020,12,1.8],
    [2021,1,3.5],[2021,2,10],[2021,3,14],[2021,4,30],[2021,5,42],[2021,6,30],[2021,7,32],[2021,8,70],[2021,9,155],[2021,10,180],[2021,11,240],[2021,12,170],
    [2022,1,130],[2022,2,95],[2022,3,105],[2022,4,100],[2022,5,48],[2022,6,33],[2022,7,40],[2022,8,32],[2022,9,33],[2022,10,31],[2022,11,12],[2022,12,11],
    [2023,1,18],[2023,2,23],[2023,3,21],[2023,4,21],[2023,5,20],[2023,6,18],[2023,7,25],[2023,8,20],[2023,9,22],[2023,10,32],[2023,11,60],[2023,12,110],
    [2024,1,100],[2024,2,115],[2024,3,190],[2024,4,140],[2024,5,165],[2024,6,135],[2024,7,180],[2024,8,140],[2024,9,140],[2024,10,160],[2024,11,240],[2024,12,195],
    [2025,1,210],[2025,2,165],[2025,3,130],[2025,4,125]],

  "ripple": [[2013,8,0.005],[2013,12,0.02],[2014,1,0.04],[2014,6,0.01],[2014,12,0.02],[2015,6,0.008],[2015,12,0.006],
    [2016,6,0.006],[2016,12,0.006],[2017,1,0.006],[2017,3,0.01],[2017,4,0.03],[2017,5,0.25],[2017,9,0.2],[2017,12,2.3],
    [2018,1,1.6],[2018,3,0.6],[2018,6,0.5],[2018,9,0.28],[2018,12,0.35],
    [2019,3,0.31],[2019,6,0.4],[2019,9,0.26],[2019,12,0.19],
    [2020,3,0.17],[2020,6,0.18],[2020,9,0.24],[2020,11,0.6],[2020,12,0.22],
    [2021,1,0.3],[2021,2,0.45],[2021,3,0.55],[2021,4,1.6],[2021,6,0.7],[2021,9,1.0],[2021,11,1.05],[2021,12,0.83],
    [2022,3,0.8],[2022,6,0.32],[2022,9,0.4],[2022,12,0.34],
    [2023,3,0.45],[2023,6,0.47],[2023,7,0.72],[2023,9,0.5],[2023,12,0.62],
    [2024,3,0.64],[2024,6,0.48],[2024,7,0.58],[2024,9,0.58],[2024,11,1.8],[2024,12,2.2],
    [2025,1,3.0],[2025,2,2.5],[2025,3,2.3],[2025,4,2.18]],

  "cardano": [[2017,10,0.02],[2017,11,0.1],[2017,12,0.7],[2018,1,1.05],[2018,3,0.2],[2018,6,0.14],[2018,9,0.07],[2018,12,0.04],
    [2019,3,0.05],[2019,6,0.08],[2019,9,0.04],[2019,12,0.035],
    [2020,3,0.03],[2020,6,0.08],[2020,7,0.13],[2020,9,0.1],[2020,12,0.18],
    [2021,1,0.35],[2021,2,0.9],[2021,3,1.2],[2021,4,1.3],[2021,5,1.6],[2021,6,1.4],[2021,8,2.7],[2021,9,2.2],[2021,10,2.0],[2021,11,1.8],[2021,12,1.3],
    [2022,1,1.1],[2022,3,0.9],[2022,5,0.55],[2022,6,0.45],[2022,9,0.42],[2022,12,0.25],
    [2023,3,0.34],[2023,6,0.28],[2023,9,0.25],[2023,12,0.59],
    [2024,1,0.55],[2024,3,0.72],[2024,6,0.39],[2024,9,0.35],[2024,11,0.95],[2024,12,0.88],
    [2025,1,1.0],[2025,3,0.72],[2025,4,0.72]],

  "dogecoin": [[2014,1,0.001],[2014,6,0.0003],[2014,12,0.0002],[2015,12,0.00015],[2016,12,0.0002],
    [2017,1,0.0002],[2017,5,0.003],[2017,6,0.003],[2017,12,0.009],
    [2018,1,0.017],[2018,4,0.004],[2018,6,0.003],[2018,12,0.002],
    [2019,6,0.003],[2019,12,0.002],[2020,3,0.002],[2020,7,0.003],[2020,12,0.005],
    [2021,1,0.01],[2021,2,0.05],[2021,3,0.06],[2021,4,0.35],[2021,5,0.5],[2021,6,0.25],[2021,7,0.2],[2021,10,0.25],[2021,12,0.17],
    [2022,3,0.12],[2022,6,0.065],[2022,10,0.06],[2022,12,0.07],
    [2023,6,0.065],[2023,12,0.09],
    [2024,3,0.18],[2024,6,0.12],[2024,9,0.11],[2024,11,0.39],[2024,12,0.32],
    [2025,1,0.35],[2025,3,0.17],[2025,4,0.165]],

  "tron": [[2017,9,0.002],[2017,12,0.04],[2018,1,0.2],[2018,3,0.04],[2018,4,0.06],[2018,6,0.04],[2018,9,0.02],[2018,12,0.013],
    [2019,3,0.022],[2019,6,0.03],[2019,9,0.015],[2019,12,0.014],
    [2020,3,0.01],[2020,6,0.016],[2020,9,0.028],[2020,12,0.03],
    [2021,2,0.05],[2021,4,0.13],[2021,7,0.06],[2021,9,0.09],[2021,12,0.08],
    [2022,4,0.07],[2022,6,0.065],[2022,12,0.054],
    [2023,3,0.068],[2023,6,0.076],[2023,9,0.085],[2023,12,0.105],
    [2024,3,0.13],[2024,6,0.12],[2024,9,0.15],[2024,12,0.25],
    [2025,2,0.23],[2025,4,0.125]],

  "avalanche-2": [[2020,10,4.5],[2020,11,3.0],[2020,12,3.3],
    [2021,1,8],[2021,2,30],[2021,3,28],[2021,4,28],[2021,5,28],[2021,6,14],[2021,7,16],[2021,8,42],[2021,9,65],[2021,10,60],[2021,11,130],[2021,12,100],
    [2022,1,80],[2022,2,75],[2022,3,80],[2022,4,75],[2022,5,25],[2022,6,16],[2022,7,23],[2022,8,23],[2022,9,17],[2022,10,17],[2022,11,13],[2022,12,11],
    [2023,1,17],[2023,2,18],[2023,3,17],[2023,6,13],[2023,9,9],[2023,10,11],[2023,12,40],
    [2024,1,37],[2024,3,52],[2024,6,26],[2024,9,25],[2024,11,42],[2024,12,40],
    [2025,2,24],[2025,4,38.5]],

  "chainlink": [[2017,10,0.15],[2017,12,0.6],[2018,1,1.2],[2018,3,0.4],[2018,6,0.4],[2018,9,0.25],[2018,12,0.3],
    [2019,1,0.3],[2019,3,0.3],[2019,6,2.5],[2019,9,1.7],[2019,12,1.8],
    [2020,1,2.3],[2020,3,2.2],[2020,6,4.6],[2020,8,16],[2020,10,11],[2020,12,12],
    [2021,2,27],[2021,5,38],[2021,7,18],[2021,9,25],[2021,11,28],[2021,12,20],
    [2022,3,15],[2022,6,6],[2022,9,7.5],[2022,12,5.8],
    [2023,3,7],[2023,6,6.5],[2023,10,10],[2023,12,15],
    [2024,3,18],[2024,6,14],[2024,9,11],[2024,12,22],
    [2025,2,16],[2025,4,18.2]],

  "polkadot": [[2020,8,3],[2020,9,4.5],[2020,10,4.2],[2020,11,5],[2020,12,9],
    [2021,1,9],[2021,2,35],[2021,3,35],[2021,4,40],[2021,5,22],[2021,6,20],[2021,7,14],[2021,8,25],[2021,9,32],[2021,10,42],[2021,11,45],[2021,12,27],
    [2022,1,22],[2022,3,19],[2022,5,10],[2022,6,7],[2022,9,6.2],[2022,12,4.9],
    [2023,3,6.2],[2023,6,5],[2023,12,8.5],
    [2024,3,9.5],[2024,6,6.2],[2024,12,7],[2025,4,7.85]],

  "the-open-network": [[2021,9,0.5],[2021,11,3.5],[2021,12,2.5],
    [2022,3,2],[2022,6,1.3],[2022,9,1.3],[2022,12,2.2],
    [2023,3,2.3],[2023,6,1.3],[2023,9,2],[2023,12,2.3],
    [2024,1,2.2],[2024,3,4.5],[2024,4,6.5],[2024,6,7.5],[2024,9,5.5],[2024,12,5.5],
    [2025,2,4],[2025,4,5.92]],

  "matic-network": [[2019,5,0.01],[2019,6,0.03],[2019,12,0.015],
    [2020,3,0.01],[2020,6,0.016],[2020,8,0.02],[2020,12,0.018],
    [2021,2,0.15],[2021,3,0.35],[2021,5,2.0],[2021,6,1.2],[2021,9,1.3],[2021,12,2.5],
    [2022,1,1.8],[2022,3,1.6],[2022,5,0.6],[2022,6,0.4],[2022,9,0.75],[2022,12,0.8],
    [2023,1,1.0],[2023,3,1.1],[2023,6,0.7],[2023,12,0.9],
    [2024,3,1.0],[2024,6,0.55],[2024,9,0.38],[2024,12,0.48],
    [2025,2,0.28],[2025,4,0.72]],

  "shiba-inu": [[2020,8,0.000000001],[2021,1,0.000000001],[2021,3,0.000001],[2021,5,0.000035],[2021,6,0.000008],[2021,10,0.00007],[2021,11,0.00004],[2021,12,0.000033],
    [2022,3,0.000025],[2022,6,0.00001],[2022,10,0.000011],[2022,12,0.000009],
    [2023,6,0.000007],[2023,12,0.00001],
    [2024,3,0.000028],[2024,6,0.000018],[2024,11,0.000027],[2024,12,0.000022],
    [2025,4,0.0000245]],

  "litecoin": [[2013,5,3],[2013,8,2.5],[2013,11,30],[2013,12,24],
    [2014,3,12],[2014,6,10],[2014,9,5],[2014,12,3],
    [2015,3,1.5],[2015,6,1.8],[2015,9,3],[2015,12,3.5],
    [2016,3,3.5],[2016,6,4.5],[2016,9,4],[2016,12,4.3],
    [2017,3,4],[2017,4,11],[2017,6,40],[2017,9,55],[2017,12,230],
    [2018,1,185],[2018,4,120],[2018,6,80],[2018,9,55],[2018,12,30],
    [2019,3,60],[2019,6,120],[2019,9,60],[2019,12,42],
    [2020,3,35],[2020,6,42],[2020,9,47],[2020,12,125],
    [2021,2,180],[2021,5,280],[2021,8,170],[2021,11,200],[2021,12,150],
    [2022,3,110],[2022,6,52],[2022,9,55],[2022,12,65],
    [2023,3,90],[2023,6,88],[2023,9,65],[2023,12,73],
    [2024,3,85],[2024,6,77],[2024,9,65],[2024,12,105],
    [2025,2,95],[2025,4,84]],

  "uniswap": [[2020,9,3.5],[2020,10,3],[2020,11,3.5],[2020,12,5],
    [2021,1,8],[2021,2,20],[2021,3,30],[2021,4,40],[2021,5,35],[2021,6,20],[2021,7,20],[2021,8,28],[2021,9,22],[2021,10,25],[2021,11,20],[2021,12,16],
    [2022,1,13],[2022,3,10],[2022,5,5],[2022,6,5],[2022,9,6.5],[2022,12,5.3],
    [2023,3,6],[2023,6,5.5],[2023,12,7],
    [2024,3,12],[2024,6,8],[2024,9,7],[2024,12,14],
    [2025,2,9],[2025,4,12.4]],

  "bitcoin-cash": [[2017,8,600],[2017,9,440],[2017,10,310],[2017,11,1500],[2017,12,2500],
    [2018,1,2400],[2018,3,1000],[2018,5,1200],[2018,6,740],[2018,9,530],[2018,12,130],
    [2019,3,165],[2019,6,430],[2019,9,220],[2019,12,200],
    [2020,3,170],[2020,6,230],[2020,12,340],
    [2021,2,540],[2021,5,1200],[2021,9,600],[2021,12,420],
    [2022,3,310],[2022,6,100],[2022,12,100],
    [2023,6,290],[2023,12,230],
    [2024,3,530],[2024,6,380],[2024,12,440],
    [2025,4,485]],

  "cosmos": [[2019,4,5],[2019,6,5.5],[2019,9,2.5],[2019,12,4],
    [2020,3,2],[2020,6,3],[2020,8,6],[2020,12,6.5],
    [2021,2,13],[2021,4,22],[2021,5,17],[2021,9,38],[2021,12,27],
    [2022,1,38],[2022,3,28],[2022,6,7],[2022,12,9.5],
    [2023,1,12],[2023,6,8],[2023,12,10],
    [2024,3,12],[2024,9,4.5],[2024,12,6.5],
    [2025,4,9.15]],

  "near": [[2020,10,0.7],[2020,12,1.4],
    [2021,1,1.5],[2021,2,3],[2021,3,5],[2021,4,7],[2021,6,3.5],[2021,9,8],[2021,10,9],[2021,11,12],[2021,12,14],
    [2022,1,17],[2022,3,12],[2022,5,5],[2022,6,3.5],[2022,9,3.5],[2022,12,1.5],
    [2023,2,2.2],[2023,6,1.4],[2023,12,3.5],
    [2024,1,3.2],[2024,3,7.5],[2024,6,5.5],[2024,9,4.5],[2024,12,5.2],
    [2025,4,7.25]],

  "stellar": [[2014,8,0.003],[2015,1,0.002],[2015,12,0.002],
    [2016,6,0.003],[2016,12,0.003],
    [2017,1,0.003],[2017,5,0.05],[2017,9,0.02],[2017,12,0.4],
    [2018,1,0.6],[2018,4,0.3],[2018,6,0.2],[2018,12,0.1],
    [2019,6,0.12],[2019,12,0.05],
    [2020,6,0.07],[2020,11,0.18],[2020,12,0.13],
    [2021,2,0.4],[2021,5,0.55],[2021,8,0.3],[2021,11,0.35],[2021,12,0.26],
    [2022,6,0.12],[2022,12,0.08],
    [2023,6,0.09],[2023,12,0.13],
    [2024,3,0.14],[2024,6,0.1],[2024,11,0.45],[2024,12,0.37],
    [2025,4,0.118]],

  "monero": [[2014,6,2],[2014,9,1.5],[2014,12,0.5],[2015,6,0.5],[2015,12,0.45],
    [2016,3,0.5],[2016,6,2.5],[2016,8,10],[2016,12,11],
    [2017,3,18],[2017,6,45],[2017,8,140],[2017,12,350],
    [2018,1,320],[2018,4,200],[2018,6,130],[2018,9,115],[2018,12,45],
    [2019,6,90],[2019,12,50],
    [2020,3,40],[2020,6,65],[2020,12,155],
    [2021,2,200],[2021,5,400],[2021,8,270],[2021,12,200],
    [2022,4,220],[2022,6,110],[2022,12,145],
    [2023,6,155],[2023,12,170],
    [2024,6,160],[2024,12,200],
    [2025,4,178]],

  "internet-computer": [[2021,5,350],[2021,6,45],[2021,7,38],[2021,9,55],[2021,11,40],[2021,12,28],
    [2022,3,20],[2022,5,7],[2022,6,5.5],[2022,12,3.8],
    [2023,1,5.5],[2023,6,4.5],[2023,12,11],
    [2024,3,15],[2024,6,8],[2024,12,11],
    [2025,4,12.8]],

  "aptos": [[2022,10,7.5],[2022,11,4],[2022,12,3.5],
    [2023,1,12],[2023,3,12],[2023,5,8],[2023,6,7],[2023,9,5.5],[2023,12,9.5],
    [2024,1,9],[2024,3,17],[2024,6,7.5],[2024,9,6.5],[2024,11,13],[2024,12,9.5],
    [2025,4,9.35]],

  "ethereum-classic": [[2016,8,1.5],[2016,12,1.3],
    [2017,3,2],[2017,6,18],[2017,12,30],
    [2018,1,35],[2018,5,18],[2018,6,15],[2018,12,4],
    [2019,6,8],[2019,12,4.5],
    [2020,3,4.5],[2020,8,7],[2020,12,5.5],
    [2021,2,11],[2021,5,105],[2021,8,55],[2021,11,50],[2021,12,35],
    [2022,3,32],[2022,6,15],[2022,9,30],[2022,12,17],
    [2023,6,16],[2023,12,22],
    [2024,3,33],[2024,6,24],[2024,12,26],
    [2025,4,27.4]],

  "filecoin": [[2020,10,30],[2020,12,23],
    [2021,1,22],[2021,3,90],[2021,4,170],[2021,6,60],[2021,9,80],[2021,12,36],
    [2022,3,22],[2022,6,5.5],[2022,12,3.2],
    [2023,2,7],[2023,6,4],[2023,12,8],
    [2024,3,9],[2024,6,4.5],[2024,12,5.3],
    [2025,4,5.85]],

  "hedera-hashgraph": [[2019,10,0.04],[2019,12,0.013],
    [2020,3,0.01],[2020,12,0.035],
    [2021,2,0.15],[2021,3,0.35],[2021,4,0.35],[2021,9,0.45],[2021,11,0.45],[2021,12,0.3],
    [2022,3,0.25],[2022,6,0.07],[2022,12,0.045],
    [2023,6,0.05],[2023,12,0.09],
    [2024,3,0.12],[2024,6,0.08],[2024,11,0.27],[2024,12,0.27],
    [2025,4,0.112]],

  "aave": [[2020,10,28],[2020,12,88],
    [2021,2,480],[2021,5,530],[2021,7,280],[2021,10,310],[2021,11,280],[2021,12,230],
    [2022,1,190],[2022,3,160],[2022,6,55],[2022,9,75],[2022,12,55],
    [2023,1,75],[2023,6,65],[2023,10,85],[2023,12,105],
    [2024,3,120],[2024,6,90],[2024,9,145],[2024,12,340],
    [2025,2,240],[2025,4,105]],

  "maker": [[2017,2,12],[2017,6,120],[2017,12,850],
    [2018,1,1400],[2018,6,600],[2018,12,320],
    [2019,6,650],[2019,12,440],
    [2020,3,280],[2020,12,580],
    [2021,2,2200],[2021,5,4500],[2021,9,3500],[2021,12,2300],
    [2022,3,2000],[2022,6,800],[2022,12,600],
    [2023,6,700],[2023,10,1500],[2023,12,1700],
    [2024,3,2500],[2024,6,2300],[2024,12,1600],
    [2025,4,2850]],

  "fantom": [[2018,11,0.01],[2018,12,0.008],
    [2019,6,0.015],[2019,12,0.01],
    [2020,3,0.003],[2020,9,0.02],[2020,12,0.025],
    [2021,2,0.25],[2021,4,0.5],[2021,5,0.4],[2021,9,1.5],[2021,10,2.5],[2021,12,1.6],
    [2022,1,2.8],[2022,3,1.3],[2022,6,0.24],[2022,12,0.2],
    [2023,6,0.3],[2023,12,0.43],
    [2024,3,0.65],[2024,12,0.7],
    [2025,4,0.78]],

  "injective-protocol": [[2020,11,1.5],[2020,12,1.3],
    [2021,2,8],[2021,4,18],[2021,5,10],[2021,9,8],[2021,11,12],[2021,12,7],
    [2022,3,5],[2022,6,1.5],[2022,12,1.3],
    [2023,1,2.5],[2023,4,8],[2023,6,7],[2023,10,16],[2023,12,38],
    [2024,1,35],[2024,3,38],[2024,6,22],[2024,9,18],[2024,12,28],
    [2025,4,26.8]],

  "kaspa": [[2022,7,0.003],[2022,9,0.03],[2022,12,0.01],
    [2023,1,0.015],[2023,4,0.03],[2023,6,0.035],[2023,8,0.05],[2023,10,0.07],[2023,12,0.12],
    [2024,1,0.1],[2024,3,0.14],[2024,6,0.17],[2024,8,0.17],[2024,12,0.12],
    [2025,4,0.145]],

  "sui": [[2023,5,1.2],[2023,6,0.8],[2023,8,0.5],[2023,10,0.5],[2023,12,1.0],
    [2024,1,1.3],[2024,3,1.9],[2024,5,1.0],[2024,7,0.7],[2024,9,1.6],[2024,12,4.3],
    [2025,1,4.0],[2025,3,2.1],[2025,4,1.85]],

  "stacks": [[2019,11,0.2],[2019,12,0.15],
    [2020,3,0.1],[2020,9,0.2],[2020,12,0.25],
    [2021,2,0.5],[2021,4,1.8],[2021,9,1.2],[2021,11,2.2],[2021,12,1.8],
    [2022,3,1.4],[2022,6,0.3],[2022,12,0.22],
    [2023,3,0.9],[2023,6,0.6],[2023,12,1.7],
    [2024,1,1.6],[2024,3,3.5],[2024,6,1.7],[2024,12,1.7],
    [2025,4,2.85]],

  "render-token": [[2020,7,0.05],[2020,12,0.07],
    [2021,3,1.8],[2021,5,5],[2021,8,0.8],[2021,11,6.5],[2021,12,3.5],
    [2022,3,3],[2022,5,0.7],[2022,6,0.5],[2022,12,0.4],
    [2023,1,0.6],[2023,6,1.8],[2023,11,4],[2023,12,5],
    [2024,1,4.5],[2024,3,12],[2024,5,10],[2024,9,5],[2024,12,8],
    [2025,4,9.85]],

  "fetch-ai": [[2019,3,0.3],[2019,6,0.1],[2019,12,0.03],
    [2020,3,0.02],[2020,9,0.05],[2020,12,0.06],
    [2021,3,0.5],[2021,4,0.7],[2021,9,0.6],[2021,11,0.8],[2021,12,0.4],
    [2022,3,0.4],[2022,6,0.06],[2022,12,0.1],
    [2023,1,0.25],[2023,6,0.23],[2023,12,0.7],
    [2024,1,0.65],[2024,3,2.8],[2024,6,1.5],[2024,9,1.3],[2024,12,1.4],
    [2025,4,2.35]],

  "bittensor": [[2023,3,50],[2023,5,80],[2023,7,250],[2023,9,230],[2023,12,300],
    [2024,1,280],[2024,3,700],[2024,5,420],[2024,7,320],[2024,9,500],[2024,11,550],[2024,12,450],
    [2025,4,520]],

  "pepe": [[2023,5,0.0000015],[2023,6,0.0000012],[2023,8,0.0000008],[2023,10,0.000001],[2023,12,0.0000015],
    [2024,1,0.0000012],[2024,3,0.00001],[2024,5,0.000012],[2024,6,0.000011],[2024,9,0.000008],[2024,11,0.00002],[2024,12,0.000018],
    [2025,4,0.0000118]],

  "arbitrum": [[2023,3,1.2],[2023,5,1.1],[2023,7,1.15],[2023,9,0.85],[2023,12,1.2],
    [2024,1,1.8],[2024,3,1.8],[2024,5,1.0],[2024,7,0.7],[2024,9,0.55],[2024,12,0.75],
    [2025,4,1.18]],

  "optimism": [[2022,6,0.7],[2022,8,1.3],[2022,10,0.9],[2022,12,0.9],
    [2023,1,2.2],[2023,3,2.5],[2023,6,1.4],[2023,9,1.3],[2023,12,3.5],
    [2024,1,3.3],[2024,3,4.0],[2024,6,2.2],[2024,9,1.6],[2024,12,1.8],
    [2025,4,2.65]],

  "tezos": [[2018,7,3.5],[2018,9,1.2],[2018,12,0.4],
    [2019,6,1.3],[2019,12,1.3],
    [2020,2,2.8],[2020,3,1.4],[2020,8,3.5],[2020,12,2.0],
    [2021,2,4.5],[2021,5,6],[2021,10,7.5],[2021,12,4.3],
    [2022,3,3],[2022,6,1.5],[2022,12,0.8],
    [2023,6,0.75],[2023,12,1.05],
    [2024,3,1.3],[2024,12,1.2],
    [2025,4,1.05]],

  "synthetix-network-token": [[2018,3,0.4],[2018,6,0.2],[2018,12,0.04],
    [2019,6,0.6],[2019,12,1.2],
    [2020,3,0.5],[2020,6,1.8],[2020,9,5],[2020,12,7],
    [2021,2,20],[2021,5,15],[2021,8,10],[2021,12,6],
    [2022,3,5],[2022,6,2],[2022,12,1.5],
    [2023,6,2.2],[2023,12,3.5],
    [2024,3,4.5],[2024,12,2.2],
    [2025,4,3.25]],

  "theta-token": [[2018,2,0.15],[2018,5,0.1],[2018,12,0.05],
    [2019,6,0.1],[2019,12,0.1],
    [2020,6,0.25],[2020,12,0.7],
    [2021,3,10],[2021,4,12],[2021,6,7],[2021,11,5],[2021,12,4.5],
    [2022,4,3],[2022,6,1.2],[2022,12,0.8],
    [2023,6,0.7],[2023,12,1.1],
    [2024,3,2.8],[2024,12,1.8],
    [2025,4,2.15]],

  "algorand": [[2019,7,0.3],[2019,12,0.2],
    [2020,3,0.1],[2020,8,0.35],[2020,12,0.35],
    [2021,2,1.2],[2021,4,1.4],[2021,6,0.8],[2021,9,2.2],[2021,11,1.8],[2021,12,1.4],
    [2022,3,0.8],[2022,6,0.3],[2022,12,0.18],
    [2023,6,0.12],[2023,12,0.22],
    [2024,3,0.26],[2024,6,0.17],[2024,11,0.38],[2024,12,0.35],
    [2025,4,0.215]],

  "compound-governance-token": [[2020,7,180],[2020,9,140],[2020,12,150],
    [2021,2,470],[2021,5,500],[2021,9,340],[2021,12,230],
    [2022,4,140],[2022,6,35],[2022,12,35],
    [2023,6,50],[2023,12,75],
    [2024,3,95],[2024,12,85],
    [2025,4,62]],

  "curve-dao-token": [[2020,8,3],[2020,12,0.7],
    [2021,1,1.5],[2021,4,3.5],[2021,9,4],[2021,12,4.5],
    [2022,1,3.5],[2022,4,2.5],[2022,6,0.6],[2022,12,0.5],
    [2023,6,0.65],[2023,12,0.6],
    [2024,3,0.7],[2024,12,0.45],
    [2025,4,0.58]]
};


// Interpolate real historical price from milestones
function getHistoricalPrice(coinId, date) {
  const d = new Date(date);
  const coin = TOP_COINS.find(c => c.id === coinId);
  if (!coin) return null;
  // Stablecoins always ~$1
  if (["USDT","USDC","DAI","STETH"].includes(coin.symbol)) {
    if (coin.symbol === "STETH") {
      // STETH tracks ETH price roughly
      const ethPrice = getHistoricalPrice("ethereum", date);
      return ethPrice ? ethPrice * 0.998 : null;
    }
    return 1.00;
  }
  // WBTC tracks BTC
  if (coin.symbol === "WBTC") {
    const btcPrice = getHistoricalPrice("bitcoin", date);
    return btcPrice ? btcPrice * 0.999 : null;
  }
  
  const hist = PRICE_HISTORY[coinId];
  if (!hist || hist.length === 0) {
    // No detailed history: use simplified model from launch
    const launch = new Date(coin.launch);
    if (d < launch) return null;
    const life = (new Date() - launch) / 864e5;
    const since = (d - launch) / 864e5;
    const prog = since / life;
    // Better curve: start at ~2% of current price, grow with crypto-like cycles
    const base = 0.015 + (1 - 0.015) * Math.pow(prog, 0.5);
    const yearFrac = since / 365;
    // 4-year crypto cycle
    const cycle = 1 + 0.6 * Math.sin(yearFrac * Math.PI / 2);
    return coin.mockPrice * base * cycle * 0.7;
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const dayOfMonth = d.getDate();
  
  // Convert date to fractional month position
  const dateVal = year * 12 + month + (dayOfMonth - 1) / 30;
  
  // Find surrounding milestones
  let before = null, after = null;
  for (let i = 0; i < hist.length; i++) {
    const mVal = hist[i][0] * 12 + hist[i][1];
    if (mVal <= dateVal) before = { val: mVal, price: hist[i][2], idx: i };
    if (mVal >= dateVal && !after) after = { val: mVal, price: hist[i][2], idx: i };
  }
  
  // Before first milestone
  if (!before) {
    const launch = new Date(coin.launch);
    if (d < launch) return null;
    return after ? after.price : null;
  }
  // After last milestone
  if (!after) return before.price;
  // Exact match or same point
  if (before.val === after.val) return before.price;
  
  // Linear interpolation between milestones
  const ratio = (dateVal - before.val) / (after.val - before.val);
  return before.price + (after.price - before.price) * ratio;
}

// ── Main App ──
export default function CryptoIdea(){
  const[screen,setScreen]=useState("loading");
  const[user,setUser]=useState(null);
  const[dataLoaded,setDataLoaded]=useState(false);
  const[site,setSite]=useState({maintenance:false,signupsEnabled:true,plans:null});  // public config from /api/config
  const[authMode,setAuthMode]=useState("login");
  const[authEmail,setAuthEmail]=useState("");
  const[authPass,setAuthPass]=useState("");
  const[authName,setAuthName]=useState("");
  const[authErr,setAuthErr]=useState("");
  const[showPlan,setShowPlan]=useState(false);
  const[proBilling,setProBilling]=useState("yearly");
  const[proStep,setProStep]=useState("pick");
  const[resetSent,setResetSent]=useState(false);
  const[contactMsg,setContactMsg]=useState("");
  const[contactSent,setContactSent]=useState(false);
  const[fpEmail,setFpEmail]=useState("");
  const[fpErr,setFpErr]=useState("");
  const[upgradeFlow,setUpgradeFlow]=useState(null);  // null | "pro" | "premium"
  const[upgradeStep,setUpgradeStep]=useState("billing");  // billing | processing | welcome
  const[upgradeBilling,setUpgradeBilling]=useState("yearly");
  const[downgradeTo,setDowngradeTo]=useState(null);  // null | "free" | "pro"
  const[showWelcome,setShowWelcome]=useState(null);  // null | "free" | "pro" | "premium"
  const[showPaymentFailedSim,setShowPaymentFailedSim]=useState(false);
  const[portfolios,setPortfolios]=useState([{id:"default",name:"My Portfolio",coins:[]}]);
  const[activePortId,setActivePortId]=useState("default");
  const[showPortManager,setShowPortManager]=useState(false);
  const[newPortName,setNewPortName]=useState("");
  const portfolio=portfolios.find(p=>p.id===activePortId)?.coins||[];
  const setPortfolio=(fn)=>{setPortfolios(prev=>prev.map(p=>p.id===activePortId?{...p,coins:typeof fn==="function"?fn(p.coins):fn}:p))};
  const[prices,setPrices]=useState({});
  const[sq,setSq]=useState("");
  const[liveCoins,setLiveCoins]=useState([]);  // live CoinGecko search results (any coin)
  const[sel,setSel]=useState(null);
  const[err,setErr]=useState("");
  const isPro=user?.tier==="pro"||user?.tier==="premium";
  const isPremium=user?.tier==="premium";
  const[api,setApi]=useState("demo");
  const[eAmt,setEAmt]=useState("");
  const[ePrice,setEPrice]=useState("");
  const[eDate,setEDate]=useState(new Date().toISOString().slice(0,16));
  const[confirmDel,setConfirmDel]=useState(false);
  const[swipeId,setSwipeId]=useState(null);
  const[swipeX,setSwipeX]=useState(0);
  const[touchStart,setTouchStart]=useState(null);
  const[editEntry,setEditEntry]=useState(null);
  const[infoCoin,setInfoCoin]=useState(null);
  const[eTxType,setETxType]=useState("buy");


  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`@keyframes pulse{0%{transform:scale(1);opacity:0.4}50%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:0}}@keyframes fadeIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);

  useEffect(()=>{const m={};TOP_COINS.forEach(c=>{m[c.id]={usd:c.mockPrice,usd_24h_change:c.mockChange,usd_market_cap:c.mockMcap}});setPrices(m)},[]);

  // Public app flags (maintenance / signups) set by an admin — read once on load.
  useEffect(()=>{fetchSiteConfig().then(d=>{if(d)setSite({maintenance:!!d.maintenance,signupsEnabled:d.signupsEnabled!==false,plans:d.plans||null})})},[]);

  // ═══ Watch Firebase auth state + load saved data on startup ═══
  useEffect(()=>{
    const loadPortfolios=async(uid)=>{
      // Load portfolios (and their coins + transactions) from Firestore so data
      // syncs across devices. The counters live on these docs and are enforced by rules.
      const res=await getPortfolios(uid);
      if(!res.success)return;
      const ports=[];
      for(const p of res.portfolios){
        const cr=await getCoins(uid,p.id);
        ports.push({id:p.id,name:p.name,coins:cr.success?cr.coins:[]});
      }
      if(ports.length>0){
        setPortfolios(ports);
        // Restore last active portfolio if it still exists, else use the first one
        const savedActive=await db.get("ci-active-port");
        setActivePortId(ports.find(p=>p.id===savedActive)?savedActive:ports[0].id);
      }
    };
    // Firebase is the source of truth for who is logged in. The password lives
    // in Firebase Auth and is never stored on the device.
    const unsub=onAuthChange(async(fbUser)=>{
      if(fbUser){
        // Non-sensitive profile (tier, subscription, settings) kept locally, keyed by uid
        const profile=await db.get("ci-profile-"+fbUser.uid)||{};
        const baseUser={
          tier:"free",
          joined:new Date().toISOString().split("T")[0],
          ...profile,
          uid:fbUser.uid,
          email:fbUser.email,
          name:fbUser.displayName||profile.name||(fbUser.email?fbUser.email.split("@")[0]:""),
        };
        await loadPortfolios(fbUser.uid);
        // Check if subscription expired or payment failed
        const checked=await checkSubscriptionStatus(baseUser);
        setUser(checked);
        setScreen("portfolio");
      }else{
        setUser(null);
        setScreen("login");
      }
      setDataLoaded(true);
    });
    return ()=>{ if(typeof unsub==="function") unsub(); };
  },[]);

  // ═══ Auto-save user profile when it changes (never stores a password) ═══
  useEffect(()=>{
    if(!dataLoaded)return;
    if(user&&user.uid){saveProfile(user)}
  },[user,dataLoaded]);

  // Portfolios/coins/transactions are now persisted to Firestore per-mutation
  // (see addPortfolio/deletePortfolio/addCoin/remCoin/addEntry/remEntry), so the
  // old bulk local-storage save effect has been removed.

  // ═══ Remember which portfolio is active (local UI preference) ═══
  useEffect(()=>{
    if(!dataLoaded)return;
    db.set("ci-active-port",activePortId);
  },[activePortId,dataLoaded]);

  useEffect(()=>{if(!portfolio.length)return;const ids=portfolio.map(c=>c.id).join(",");const f=()=>fetchPrices(ids).then(d=>{if(d){setPrices(p=>({...p,...d}));setApi("live")}});f();const iv=setInterval(f,60000);return()=>clearInterval(iv)},[portfolio]);

  const sr=useMemo(()=>{if(sq.length<1)return[];const q=sq.toLowerCase();return TOP_COINS.filter(c=>c.name.toLowerCase().startsWith(q)||c.symbol.toLowerCase().startsWith(q)).slice(0,25)},[sq]);

  // ═══ Live coin search via the /api proxy (any coin on CoinGecko) ═══
  useEffect(()=>{
    const q=sq.trim();
    if(q.length<2){setLiveCoins([]);return}
    let cancelled=false;
    const t=setTimeout(()=>{
      searchCoins(q).then(coins=>{if(!cancelled&&coins)setLiveCoins(coins)});
    },300);
    return()=>{cancelled=true;clearTimeout(t)};
  },[sq]);

  // Local top-coin matches first, then any other live results (deduped)
  const searchResults=useMemo(()=>{
    const seen=new Set(sr.map(c=>c.id));
    return [...sr,...liveCoins.filter(c=>!seen.has(c.id))];
  },[sr,liveCoins]);

  const showErr=(m)=>{setErr(m);setTimeout(()=>setErr(""),3000)};

  // Persist only non-sensitive profile data (tier, subscription, settings),
  // keyed by Firebase uid. Passwords are handled by Firebase Auth, never stored here.
  const saveProfile=async(u)=>{
    if(!u||!u.uid)return;
    const {uid,pass,loggedOut,...rest}=u;
    await db.set("ci-profile-"+uid,rest);
  };

  const handleAuth=async()=>{
    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex=/^[a-zA-Z\s]{2,30}$/;
    if(!authEmail){setAuthErr("Enter your email");return}
    if(!emailRegex.test(authEmail)){setAuthErr("Enter a valid email (e.g. name@email.com)");return}
    if(!authPass){setAuthErr("Enter your password");return}
    if(authMode==="register"&&!site.signupsEnabled){setAuthErr("New signups are currently paused. Please check back soon.");return}
    if(authMode==="register"){
      // Password strength is enforced ONLY at registration. Login just checks the password
      // is correct (Firebase does that) — re-validating composition on login would lock out
      // any valid account whose password predates a rule change, and leaks the policy for no gain.
      if(authPass.length<8){setAuthErr("Password must be at least 8 characters");return}
      if(authPass.length>50){setAuthErr("Password is too long");return}
      if(!/[A-Z]/.test(authPass)){setAuthErr("Password needs at least 1 uppercase letter (A-Z)");return}
      if(!/[a-z]/.test(authPass)){setAuthErr("Password needs at least 1 lowercase letter (a-z)");return}
      if(!/[0-9]/.test(authPass)){setAuthErr("Password needs at least 1 number (0-9)");return}
      if(!/[!@#$%^&*()_+\-={}|;:,.<>?]/.test(authPass)){setAuthErr("Password needs at least 1 special character (!@#$%...)");return}
      if(!authName){setAuthErr("Enter your name");return}
      if(!nameRegex.test(authName.trim())){setAuthErr("Name: letters only, 2-30 characters");return}
      const em=authEmail.toLowerCase().trim();
      // Create the account in Firebase Auth (password is stored securely by Firebase, never locally)
      const res=await registerUser(em,authPass,authName.trim());
      if(!res.success){setAuthErr(res.error||"Could not create account");return}
      const newUser={uid:res.user.uid,email:em,name:authName.trim()||em.split("@")[0],tier:"free",joined:new Date().toISOString().split("T")[0]};
      setUser(newUser);
      await saveProfile(newUser);
      setAuthErr("");setShowPlan(true);setUpgradeStep("pickPlan");
    }else{
      // Login: verify credentials against Firebase Auth
      const em=authEmail.toLowerCase().trim();
      const res=await loginUser(em,authPass);
      if(!res.success){setAuthErr(res.error||"Could not log in");return}
      setAuthErr("");
      // onAuthChange (above) loads the profile + portfolios and navigates to the portfolio.
    }};

  const logout=async()=>{
    // Sign out of Firebase; onAuthChange will clear the session. No credentials are kept on the device.
    await logoutUser();
    setUser(null);setPortfolios([{id:"default",name:"My Portfolio",coins:[]}]);setActivePortId("default");setScreen("login");setAuthEmail("");setAuthPass("");setAuthName("")};

  // ── Self-service privacy (GDPR/CCPA): export + delete your own data ──
  const [acctBusy,setAcctBusy]=useState(false);
  const [acctMsg,setAcctMsg]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  const downloadMyData=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      const r=await httpsCallable(functions,"exportMyData")();
      const blob=new Blob([JSON.stringify(r.data,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="crypto-idea-my-data.json";a.click();
      URL.revokeObjectURL(url);
      setAcctMsg("Downloaded ✓");
    }catch(e){setAcctMsg((e&&e.message)||"Export failed");}
    setAcctBusy(false);
  };
  const deleteMyAccount=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      await httpsCallable(functions,"deleteMyAccount")();
      await logoutUser();
      setUser(null);setScreen("login");
    }catch(e){setAcctMsg((e&&e.message)||"Delete failed");setAcctBusy(false);}
  };
  const startUpgrade=(toTier)=>{setUpgradeFlow(toTier);setUpgradeStep("billing");setShowPlan(true)};
  const startDowngrade=(toTier)=>{setDowngradeTo(toTier)};
  const confirmDowngrade=async()=>{
    // In production: PayPal cancels subscription, downgrade happens at endDate
    // For demo: mark as cancelled, keep current tier until endDate
    const updated={...user,subscription:{...(user.subscription||{}),cancelled:true,downgradeTo}};
    setUser(updated);
    await saveProfile(updated);
    setDowngradeTo(null);
  };
  const upgradePro=()=>startUpgrade("pro");
  const downgradeFree=()=>startDowngrade("free");
  const premLimits=user?.premiumLimits||{};
  // Admin-configured tier limits (from /api/config); fall back to built-in defaults.
  const _tierKey=isPremium?"premium":isPro?"pro":"free";
  const _planLim=(key,def)=>{const p=site.plans&&site.plans[_tierKey];return (p&&p[key]!=null)?p[key]:def;};
  const maxPortfolios=isPremium?(premLimits.portfolios||_planLim("portfolios",50)):_planLim("portfolios",isPro?10:1);
  const maxCoinsPerPort=isPremium?(premLimits.coins||_planLim("coins",500)):_planLim("coins",isPro?200:10);
  const maxTxPerCoin=isPremium?(premLimits.transactions||_planLim("transactions",5000)):_planLim("transactions",isPro?2000:50);


  const addPortfolio=async()=>{
    if(portfolios.length>=maxPortfolios){showErr(isPro?"Max 10 portfolios":"Free: 1 portfolio. Upgrade to Pro for 10!");return}
    if(!newPortName.trim()){showErr("Enter a portfolio name");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbCreatePortfolio(user.uid,newPortName.trim(),portfolios.length);
    if(!res.success){showErr("Couldn't create portfolio. Check your connection.");return}
    const np={id:res.id,name:newPortName.trim(),coins:[]};
    setPortfolios(prev=>[...prev,np]);setActivePortId(res.id);setNewPortName("")};

  const deletePortfolio=async(pid)=>{
    if(portfolios.length<=1){showErr("Need at least 1 portfolio");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeletePortfolio(user.uid,pid);
    if(!res.success){showErr("Couldn't delete portfolio. Check your connection.");return}
    setPortfolios(prev=>prev.filter(p=>p.id!==pid));
    if(activePortId===pid){setActivePortId(portfolios.find(p=>p.id!==pid)?.id||"default")}};

  const addCoin=async(c)=>{
    if(portfolio.find(x=>x.id===c.id)){showErr("Already added");return}
    const lim=maxCoinsPerPort;
    if(portfolio.length>=lim){showErr(isPro?"Max "+maxCoinsPerPort+" coins per portfolio":"Free: "+maxCoinsPerPort+" coins. Upgrade to Pro for "+200+"!");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbAddCoin(user.uid,activePortId,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb});
    if(!res.success){showErr("Couldn't add coin. Check your connection.");return}
    setPortfolio(p=>[...p,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb,entries:[]}]);setScreen("portfolio");setSq("")};
  const remCoin=async(id)=>{
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbRemoveCoin(user.uid,activePortId,id);
    if(!res.success){showErr("Couldn't remove coin. Check your connection.");return}
    setPortfolio(p=>p.filter(c=>c.id!==id));if(sel?.id===id){setSel(null);setScreen("portfolio")}};
  const addEntry=async()=>{if(!eAmt||!ePrice)return;
    if(sel){
      const currentTxCount=sel.entries.filter(e=>!editEntry||e.id!==editEntry.id).length;
      if(currentTxCount>=maxTxPerCoin){showErr("Max "+maxTxPerCoin+" transactions per coin"+(isPro?"":" · Upgrade to Pro for 2,000!"));return}

    }
    if(eTxType==="sell"&&sel){
      const sellDate=new Date(eDate);
      const holdingsAtDate=sel.entries.reduce((s,e)=>{
        if(editEntry&&e.id===editEntry.id)return s;
        if(new Date(e.date)>sellDate)return s;
        return e.type==="sell"?s-e.amount:s+e.amount;
      },0);
      if(holdingsAtDate<=0){
        showErr("No "+sel.symbol+" owned at this date. Buy first before selling.");
        return;
      }
      if(parseFloat(eAmt)>holdingsAtDate){
        showErr("Only "+holdingsAtDate.toFixed(6)+" "+sel.symbol+" owned at this date");
        return;
      }
    }
    if(!user?.uid){showErr("Please sign in again");return}
    if(editEntry){
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbUpdateTransaction(user.uid,activePortId,sel.id,editEntry.id,txData);
      if(!res.success){showErr("Couldn't save transaction. Check your connection.");return}
      const updated={...editEntry,...txData};
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:c.entries.map(e=>e.id===editEntry.id?updated:e)}:c));
      setSel(p=>({...p,entries:p.entries.map(e=>e.id===editEntry.id?updated:e)}));
    }else{
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbAddTransaction(user.uid,activePortId,sel.id,txData);
      if(!res.success){showErr("Couldn't add transaction. Check your connection.");return}
      const en={id:res.id,...txData};
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:[...c.entries,en]}:c));
      setSel(p=>({...p,entries:[...p.entries,en]}));
    }
    setEAmt("");setEPrice("");setEditEntry(null);setScreen("detail")};
  const remEntry=async(cid,eid)=>{
    const coin=portfolio.find(c=>c.id===cid);if(!coin)return;
    const remaining=coin.entries.filter(e=>e.id!==eid).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let bal=0;for(const e of remaining){bal=e.type==="sell"?bal-e.amount:bal+e.amount;
      if(bal<-0.00000001){showErr("Can\'t delete — a sell on "+e.date.split("T")[0]+" depends on it");return}}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeleteTransaction(user.uid,activePortId,cid,eid);
    if(!res.success){showErr("Couldn't delete transaction. Check your connection.");return}
    setPortfolio(p=>p.map(c=>c.id===cid?{...c,entries:c.entries.filter(e=>e.id!==eid)}:c));setSel(p=>p?{...p,entries:p.entries.filter(e=>e.id!==eid)}:p)};


  const tv=portfolio.reduce((s,c)=>{const p=prices[c.id]?.usd||0;return s+c.entries.reduce((a,e)=>a+e.amount,0)*p},0);
  const tinv=portfolio.reduce((s,c)=>{const b=c.entries.filter(e=>e.type!=="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0);const sl=c.entries.filter(e=>e.type==="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0);return s+(b-sl)},0);
  const totalBuys=portfolio.reduce((s,c)=>s+c.entries.filter(e=>e.type!=="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0),0);
  const totalSells=portfolio.reduce((s,c)=>s+c.entries.filter(e=>e.type==="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0),0);
  const tpnl=(tv+totalSells)-totalBuys;const tpp=totalBuys>0?((tv+totalSells-totalBuys)/totalBuys)*100:0;

  const c={bg:"#FFFFFF",card:"#F8F9FA",ac:"#34C759",acd:"#34C75915",red:"#FF3B30",redd:"#FF3B3012",yel:"#FF9500",yeld:"#FF950012",txt:"#1A1A1A",dim:"#999",bdr:"#F0F0F0",inp:"#F5F5F7",blu:"#007AFF",blud:"#007AFF12"};
  const inp_s={width:"100%",padding:"14px 16px",background:c.inp,border:"1px solid #E8E8ED",borderRadius:14,color:c.txt,fontSize:15,outline:"none",boxSizing:"border-box"};
  const lbl_s={fontSize:12,color:c.dim,display:"block",marginBottom:5,fontWeight:500};
  const sb=(bg,cl)=>({padding:"8px 14px",borderRadius:12,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:bg,color:cl,display:"inline-flex",alignItems:"center",gap:4});

  const Ic={
    back:<svg width="22" height="22" fill="none" stroke={c.txt} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    plus:<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:<svg width="14" height="14" fill="none" stroke={c.red} strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    clock:<svg width="12" height="12" fill="none" stroke={c.dim} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    port:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    srch:(a)=><svg width="21" height="21" fill="none" stroke={a?c.ac:c.dim} strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  };

  const CI=({thumb,symbol,size=38})=>{const[e,setE]=useState(false);const colors={"BTC":"#F7931A","ETH":"#627EEA","BNB":"#F3BA2F","SOL":"#9945FF","XRP":"#23292F","ADA":"#0D1E30","DOGE":"#C2A633","USDT":"#26A17B","USDC":"#2775CA","DOT":"#E6007A","AVAX":"#E84142","LINK":"#2A5ADA","UNI":"#FF007A","MATIC":"#8247E5","SHIB":"#FFA409","LTC":"#BFBBBB","ATOM":"#2E3148","NEAR":"#00C08B","TRX":"#FF0013","FTM":"#1969FF","INJ":"#00F2FE","SUI":"#4DA2FF","ARB":"#28A0F0","OP":"#FF0420","AAVE":"#B6509E","MKR":"#1AAB9B","TAO":"#000","PEPE":"#479F51"};const bg=colors[symbol]||"#"+((symbol||"XX").charCodeAt(0)*123456).toString(16).slice(0,6);return(<div style={{width:size,height:size,borderRadius:size/2,background:thumb&&!e?c.inp:bg+"30",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:700,flexShrink:0,color:thumb&&!e?c.dim:bg,border:thumb&&!e?"none":`1.5px solid ${bg}30`}}>{thumb&&!e?<img src={thumb} alt="" style={{width:size,height:size}} onError={()=>setE(true)}/>:(symbol||"?").slice(0,2)}</div>)};

  
  // ── Live/Offline Status Indicator ──
  const StatusDot=({live,small})=>{
    const size=small?6:8;
    const isLive=live||api==="live";
    return(
      <div style={{display:"inline-flex",alignItems:"center",gap:small?4:6,padding:small?"3px 8px":"4px 10px",borderRadius:20,background:isLive?c.acd:c.yeld,border:`1px solid ${isLive?"#34C75930":"#FF950030"}`}}>
        <div style={{position:"relative",width:size,height:size}}>
          <div style={{width:size,height:size,borderRadius:"50%",background:isLive?c.ac:c.yel}}/>
          {isLive&&<div style={{position:"absolute",top:-1,left:-1,width:size+2,height:size+2,borderRadius:"50%",background:isLive?c.ac:c.yel,opacity:0.4,animation:"pulse 2s infinite"}}/>}
        </div>
        <span style={{fontSize:small?9:10,fontWeight:600,color:isLive?c.ac:c.yel,letterSpacing:"0.3px"}}>{isLive?"LIVE":"OFFLINE"}</span>
      </div>
    );
  };

const hdr=(left,title,right)=>(<div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>{left}<span style={{fontSize:17,fontWeight:600}}>{title}</span>{right||<div style={{width:24}}/>}</div>);

  // ── Usage Calculation ──
  const totalCoinsUsed=portfolio.length;
  const totalTxUsed=portfolios.reduce((s,p)=>s+p.coins.reduce((cs,c)=>cs+(c.entries?.length||0),0),0);
  const maxTotalTx=maxPortfolios*maxCoinsPerPort*maxTxPerCoin;
  const coinPct=maxCoinsPerPort>0?Math.round(totalCoinsUsed/maxCoinsPerPort*100):0;
  const txPct=maxTotalTx>0?Math.round(totalTxUsed/maxTotalTx*100):0;
  // Only warn based on coins or transactions — not portfolio count (1/1 on free always = 100%)
  const usagePct=Math.max(coinPct,txPct);

  // ── Subscription Helpers ──
  const fmtDate=(d)=>new Date(d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const calcEndDate=(billing)=>{
    const d=new Date();
    if(billing==="yearly")d.setFullYear(d.getFullYear()+1);
    else d.setMonth(d.getMonth()+1);
    return d.toISOString();
  };
  const getTrimImpact=(toTier)=>{
    const limits={
      free:{ports:1,coins:10,tx:50},
      pro:{ports:10,coins:200,tx:2000},
      premium:{ports:50,coins:500,tx:5000},
    };
    const lim=limits[toTier];
    if(!lim)return null;
    const portsToDelete=Math.max(0,portfolios.length-lim.ports);
    let coinsToDelete=0,txToDelete=0;
    portfolios.slice(0,lim.ports).forEach(p=>{
      coinsToDelete+=Math.max(0,p.coins.length-lim.coins);
      p.coins.slice(0,lim.coins).forEach(coin=>{
        txToDelete+=Math.max(0,(coin.entries?.length||0)-lim.tx);
      });
    });
    portfolios.slice(lim.ports).forEach(p=>{
      p.coins.forEach(coin=>{coinsToDelete++;txToDelete+=(coin.entries?.length||0)});
    });
    return{portsToDelete,coinsToDelete,txToDelete};
  };

  // Actually trim portfolios/coins/tx to fit a tier's limits
  const trimToTier=(toTier)=>{
    const limits={
      free:{ports:1,coins:10,tx:50},
      pro:{ports:10,coins:200,tx:2000},
      premium:{ports:50,coins:500,tx:5000},
    };
    const lim=limits[toTier];
    if(!lim)return;
    setPortfolios(prev=>{
      const trimmed=prev.slice(0,lim.ports).map(p=>({
        ...p,
        coins:p.coins.slice(0,lim.coins).map(coin=>({
          ...coin,
          entries:(coin.entries||[]).slice(-lim.tx), // keep most recent
        })),
      }));
      return trimmed.length>0?trimmed:[{id:"default",name:"My Portfolio",coins:[]}];
    });
  };

  // Check on app load if subscription expired or payment failed
  const checkSubscriptionStatus=async(u)=>{
    if(!u||!u.subscription)return u;
    const now=new Date();
    const sub=u.subscription;

    // Payment failed grace period (7 days)
    if(sub.paymentFailed&&sub.paymentFailedDate){
      const failedDate=new Date(sub.paymentFailedDate);
      const daysSince=Math.floor((now-failedDate)/(1000*60*60*24));
      if(daysSince>=7){
        // Force downgrade to free
        trimToTier("free");
        const updated={...u,tier:"free",subscription:null};
        await saveProfile(updated);
        return updated;
      }
    }

    // Cancelled subscription expired
    if(sub.cancelled&&sub.endDate&&new Date(sub.endDate)<=now){
      const target=sub.downgradeTo||"free";
      trimToTier(target);
      const updated={...u,tier:target,subscription:null};
      await saveProfile(updated);
      return updated;
    }

    return u;
  };

  // ── Swipe Handlers ──
  const onTouchS=(id,e)=>{const x=e.touches?e.touches[0].clientX:e.clientX;const y=e.touches?e.touches[0].clientY:e.clientY;setTouchStart({x,y,id})};
  const onTouchM=(e)=>{
    if(!touchStart)return;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    const dx=cx-touchStart.x;
    const dy=cy-touchStart.y;
    if(Math.abs(dy)>Math.abs(dx))return;
    const clamped=Math.max(-80,Math.min(80,dx));
    setSwipeId(touchStart.id);setSwipeX(clamped);
  };
  const onTouchE=()=>{
    if(!touchStart)return;
    if(Math.abs(swipeX)<40){setSwipeId(null);setSwipeX(0)}
    else{setSwipeX(swipeX<0?-80:80)}
    setTouchStart(null);
  };
  const resetSwipe=()=>{setSwipeId(null);setSwipeX(0);setTouchStart(null)};

  // ── Portfolio ──
  const Portfolio=()=>(<>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:22,fontWeight:300,color:c.txt,letterSpacing:"-0.5px"}}>Crypto <span style={{fontWeight:700}}>Idea</span></span>
      </div>
      <div style={{display:"flex",gap:6}}>
        <StatusDot/>
        <span onClick={()=>setScreen("account")} style={{fontSize:9,padding:"3px 7px",borderRadius:20,fontWeight:700,cursor:"pointer",background:isPremium?"#AF52DE15":isPro?c.acd:c.yeld,color:isPremium?"#AF52DE":isPro?c.ac:c.yel}}>{isPremium?"PREMIUM":isPro?"PRO":"STARTER"}</span>
      </div>
    </div>
    <div style={{margin:"10px 16px",borderRadius:18,padding:"20px 18px"}}>
      <div style={{fontSize:11,color:c.dim,fontWeight:500}}>Portfolio</div>
      <div style={{fontSize:38,fontWeight:200,letterSpacing:"-2px",marginTop:2}}>${Math.floor(tv).toLocaleString()}<span style={{fontSize:22,color:"#CCC"}}>.{(tv%1).toFixed(2).slice(2)}</span></div>
      <div style={{display:"flex",gap:20,marginTop:12}}>
        <div><div style={{fontSize:10,color:c.dim}}>Invested</div><div style={{fontSize:14,fontWeight:600,marginTop:1}}>${totalBuys.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
        <div><div style={{fontSize:10,color:c.dim}}>Return</div><div style={{display:"inline-flex",padding:"4px 12px",borderRadius:20,background:tpnl>=0?c.acd:c.redd,marginTop:4}}><span style={{fontSize:13,fontWeight:600,color:tpnl>=0?c.ac:c.red}}>{tpnl>=0?"+":""}${Math.abs(tpnl).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} ({fmtPct(tpp)})</span></div></div>
      </div>
      <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6}}>
        <StatusDot small/>
        <span style={{fontSize:10,color:c.dim}}>{api==="live"?"Prices updating live":"Showing last known prices · Connect to internet for updates"}</span>
      </div>
    </div>
    {PortfolioBar()}
    <div style={{padding:"10px 18px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:14,fontWeight:600}}>My Assets <span style={{color:c.dim,fontWeight:400}}>({portfolio.length}/{maxCoinsPerPort})</span></span>
      <button onClick={()=>setScreen("search")} style={sb(c.ac,c.bg)}>{Ic.plus} Add</button>
    </div>
    {!isPro&&usagePct>=95&&usagePct<100&&<div style={{margin:"0 18px 8px",padding:"10px 14px",borderRadius:10,background:"#FFF8E1",fontSize:12,color:"#F59E0B",fontWeight:500,textAlign:"center"}}>You're close to your account limit. <span onClick={()=>startUpgrade("pro")} style={{fontWeight:700,textDecoration:"underline",cursor:"pointer"}}>Upgrade to Pro</span></div>}
    {!isPro&&usagePct>=100&&<div style={{margin:"0 18px 8px",padding:"10px 14px",borderRadius:10,background:"#FFF0F0",fontSize:12,color:c.red,fontWeight:500,textAlign:"center"}}>You've reached your account limit. <span onClick={()=>startUpgrade("pro")} style={{fontWeight:700,textDecoration:"underline",cursor:"pointer"}}>Upgrade to Pro</span></div>}
    {isPro&&!isPremium&&usagePct>=95&&<div style={{margin:"0 18px 8px",padding:"10px 14px",borderRadius:10,background:"#FFF8E1",fontSize:12,color:"#F59E0B",fontWeight:500,textAlign:"center",lineHeight:1.5}}>You're at the limit of your Pro account. Need more? <span onClick={()=>setScreen("contact")} style={{fontWeight:700,textDecoration:"underline",cursor:"pointer"}}>Contact us</span> for a custom Premium plan.</div>}
    {portfolio.length===0?(<div style={{textAlign:"center",padding:"44px 36px",color:c.dim}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{fontSize:15,fontWeight:600,color:c.txt,marginBottom:5}}>No coins yet</div><div style={{fontSize:13,lineHeight:1.5}}>Tap <strong style={{color:c.ac}}>+ Add</strong> to search and add your first crypto</div></div>):[...portfolio].map(coin=>({coin,val:Math.max(0,coin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0))*(prices[coin.id]?.usd||0)})).sort((a,b)=>b.val-a.val).map(({coin})=>{const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const h=Math.max(0,coin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0));const v=h*(pr||0);return(<div key={coin.id} style={{position:"relative",overflow:"hidden",borderBottom:"1px solid #F0F0F0"}}>
{/* Edit action (right swipe) */}
<div onClick={()=>{setSel(coin);setScreen("detail");resetSwipe()}} style={{position:"absolute",left:0,top:0,bottom:0,width:80,background:"#007AFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2,cursor:"pointer"}}>
<span style={{fontSize:18}}>✏️</span>
<span style={{fontSize:9,fontWeight:700,color:"#fff"}}>Edit</span>
</div>
{/* Delete action (left swipe) */}
<div onClick={()=>{remCoin(coin.id);resetSwipe()}} style={{position:"absolute",right:0,top:0,bottom:0,width:80,background:c.red,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2,cursor:"pointer"}}>
<span style={{fontSize:18}}>🗑️</span>
<span style={{fontSize:9,fontWeight:700,color:"#fff"}}>Delete</span>
</div>
{/* Sliding coin row */}
<div onTouchStart={(e)=>onTouchS(coin.id,e)} onTouchMove={onTouchM} onTouchEnd={onTouchE} onMouseDown={(e)=>onTouchS(coin.id,e)} onMouseMove={(e)=>{if(touchStart)onTouchM(e)}} onMouseUp={onTouchE} onMouseLeave={onTouchE}
style={{display:"flex",alignItems:"center",padding:"11px 18px",gap:11,background:c.bg,position:"relative",zIndex:2,
transform:`translateX(${swipeId===coin.id?swipeX:0}px)`,transition:touchStart?"none":"transform 0.3s ease"}}>
<div onClick={()=>{if(swipeId){resetSwipe();return}setInfoCoin(coin);setScreen("coinInfo")}} style={{display:"flex",alignItems:"center",gap:11,flex:1,minWidth:0,cursor:"pointer"}}>
<CI thumb={coin.thumb} symbol={coin.symbol}/>
<div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coin.name}</div><div style={{fontSize:11,color:c.dim,marginTop:1}}>{coin.symbol} · {h>0?h.toLocaleString("en-US",{maximumFractionDigits:6}):"0"} held</div></div>
</div>
<div onClick={()=>{if(swipeId){resetSwipe();return}setSel(coin);setScreen("detail")}} style={{textAlign:"right",cursor:"pointer",padding:"4px 0 4px 12px"}}>
{v>0?<div style={{fontSize:15,fontWeight:700}}>${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>:<div style={{fontSize:14,fontWeight:600,color:c.dim}}>$0.00</div>}
<div style={{fontSize:11,color:c.dim,marginTop:1}}>{fmtP(pr)}</div>
<div style={{fontSize:10,fontWeight:500,color:ch>=0?c.ac:c.red}}>{fmtPct(ch)}</div>
</div></div></div>)})}
  </>);

  // ── Loading Screen ──
  const Loading=()=>(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:12}}>
    <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px"}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
    <div style={{fontSize:13,color:c.dim}}>Loading your data...</div>
  </div>);

  // ── Login Screen ──
  const Login=()=>{
    if(showPlan){
      const tierLabel={free:"Starter",pro:"Pro",premium:"Premium"}[showWelcome||"free"];
      const tierColor=showWelcome==="premium"?"#AF52DE":c.ac;
      const tierBg=showWelcome==="premium"?"#AF52DE15":c.acd;

      // ── Welcome screens (after payment or registration) ──
      if(upgradeStep==="welcome"){
        const benefits={
          free:["1 portfolio","10 coins","50 transactions per coin","Live prices · Full P/L tracking"],
          pro:["10 portfolios","200 coins per portfolio","2,000 transactions per coin","Live prices · Full P/L tracking"],
          premium:["50 portfolios","500 coins per portfolio","5,000 transactions per coin","Priority support · Custom limits"],
        };
        const list=benefits[showWelcome||"free"];
        return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
          <div style={{width:64,height:64,borderRadius:32,background:tierBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:24}}>✓</div>
          <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:8,textAlign:"center"}}>Welcome to <span style={{fontWeight:700,color:tierColor}}>{tierLabel}.</span></div>
          <div style={{fontSize:14,color:c.dim,lineHeight:1.8,textAlign:"center",maxWidth:300,marginBottom:32}}>{list.map((b,i)=>(<div key={i}>{b}</div>))}</div>
          <button onClick={()=>{const wasInAccount=user&&user.tier!=="free"&&showWelcome!=="free";setShowPlan(false);setUpgradeStep("billing");setUpgradeFlow(null);setShowWelcome(null);setScreen(wasInAccount?"account":"portfolio")}} style={{padding:"14px 40px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Open {showWelcome==="free"?"My Portfolio":"My Account"}</button>
        </div>);
      }

      // ── Processing payment ──
      if(upgradeStep==="processing")return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
        <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:12}}>Processing...</div>
        <div style={{fontSize:13,color:c.dim}}>Completing your payment with PayPal</div>
      </div>);

      // ── Billing confirmation (works for both Pro and Premium) ──
      if(upgradeStep==="billing"&&upgradeFlow){
        const isPrem=upgradeFlow==="premium";
        const monthlyP=isPrem?49.99:9.99;
        const yearlyP=isPrem?399.99:79.99;
        const yearlyM=(yearlyP/12).toFixed(2);
        const accent=isPrem?"#AF52DE":c.ac;
        const accentBg=isPrem?"#AF52DE15":c.acd;
        return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
          <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:4,textAlign:"center"}}>Upgrade to <span style={{fontWeight:700,color:accent}}>{isPrem?"Premium":"Pro"}</span></div>
          <div style={{fontSize:14,color:c.dim,marginBottom:28}}>Select your billing cycle</div>
          <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:12}}>
            <div onClick={()=>setUpgradeBilling("monthly")} style={{padding:"18px 20px",borderRadius:14,border:upgradeBilling==="monthly"?"2px solid "+accent:"1px solid #E8E8ED",background:upgradeBilling==="monthly"?accentBg:"#fff",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:15,fontWeight:700}}>Monthly</div><div style={{fontSize:12,color:c.dim,marginTop:2}}>Billed every month</div></div>
              <div style={{fontSize:22,fontWeight:800}}>${monthlyP}<span style={{fontSize:11,fontWeight:400,color:c.dim}}>/mo</span></div>
            </div>
            <div onClick={()=>setUpgradeBilling("yearly")} style={{padding:"18px 20px",borderRadius:14,border:upgradeBilling==="yearly"?"2px solid "+accent:"1px solid #E8E8ED",background:upgradeBilling==="yearly"?accentBg:"#fff",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
              <div style={{position:"absolute",top:-9,right:16,background:accent,color:"#fff",padding:"2px 10px",borderRadius:20,fontSize:9,fontWeight:700}}>SAVE 33%</div>
              <div><div style={{fontSize:15,fontWeight:700}}>Yearly</div><div style={{fontSize:12,color:c.dim,marginTop:2}}>${yearlyM}/mo · billed annually</div></div>
              <div style={{fontSize:22,fontWeight:800}}>${yearlyP}<span style={{fontSize:11,fontWeight:400,color:c.dim}}>/yr</span></div>
            </div>
            <button onClick={async()=>{
              setUpgradeStep("processing");
              setTimeout(async()=>{
                const newTier=upgradeFlow;
                const endDate=calcEndDate(upgradeBilling);
                const updated={...user,tier:newTier,subscription:{billing:upgradeBilling,startDate:new Date().toISOString(),endDate,cancelled:false}};
                setUser(updated);
                await saveProfile(updated);
                setShowWelcome(newTier);
                setUpgradeStep("welcome");
              },2000);
            }} style={{padding:"15px",borderRadius:14,border:"none",background:"#FFC439",color:"#111",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4}}>
              Pay with <span style={{fontStyle:"italic",fontWeight:800}}>Pay<span style={{color:"#253B80"}}>Pal</span></span>
            </button>
            <button onClick={()=>{setUpgradeFlow(null);setUpgradeStep("pickPlan")}} style={{padding:"12px",background:"none",border:"none",fontSize:13,color:c.dim,cursor:"pointer",fontWeight:500}}>← Back to plans</button>
          </div>
        </div>);
      }

      // ── Pick plan (after registration) ──
      return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:4}}>Welcome, <span style={{fontWeight:700}}>{user?.name}</span></div>
      <div style={{fontSize:14,color:c.dim,marginBottom:24}}>Select a plan</div>
      <div style={{width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:12}}>
        <div onClick={async()=>{setShowWelcome("free");setUpgradeStep("welcome")}} style={{background:"#fff",borderRadius:18,padding:"20px",border:"1px solid #E8E8ED",cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16,fontWeight:700}}>Starter</span><span style={{fontSize:20,fontWeight:800}}>$0</span></div>
          <div style={{fontSize:11,color:c.dim,lineHeight:1.6}}>1 portfolio · 10 coins · 50 transactions per coin</div>
          <div style={{marginTop:12,padding:"11px",borderRadius:12,background:"#F5F5F7",textAlign:"center",fontSize:13,fontWeight:600,color:c.txt}}>Get Started</div>
        </div>
        <div onClick={()=>{setUpgradeFlow("pro");setUpgradeStep("billing")}} style={{background:"#fff",borderRadius:18,padding:"20px",border:"2px solid "+c.ac,cursor:"pointer",position:"relative"}}>
          <div style={{position:"absolute",top:"-10px",left:"50%",transform:"translateX(-50%)",background:c.ac,color:"#fff",padding:"3px 14px",borderRadius:20,fontSize:9,fontWeight:700}}>RECOMMENDED</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16,fontWeight:700}}>Pro</span><span style={{fontSize:13,color:c.dim}}>from $6.67/mo</span></div>
          <div style={{fontSize:11,color:c.dim,lineHeight:1.6}}>10 portfolios · 200 coins · 2,000 transactions per coin</div>
          <div style={{marginTop:12,padding:"11px",borderRadius:12,background:c.ac,textAlign:"center",fontSize:13,fontWeight:600,color:"#fff"}}>Choose Pro</div>
        </div>
        <div onClick={()=>{setUpgradeFlow("premium");setUpgradeStep("billing")}} style={{background:"#fff",borderRadius:18,padding:"20px",border:"1px solid #AF52DE",cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16,fontWeight:700,color:"#AF52DE"}}>Premium</span><span style={{fontSize:13,color:c.dim}}>from $33.33/mo</span></div>
          <div style={{fontSize:11,color:c.dim,lineHeight:1.6}}>50 portfolios · 500 coins · 5,000 transactions per coin</div>
          <div style={{marginTop:12,padding:"11px",borderRadius:12,background:"#AF52DE",textAlign:"center",fontSize:13,fontWeight:600,color:"#fff"}}>Choose Premium</div>
        </div>
      </div>
    </div>);}
    return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{fontSize:32,fontWeight:200,letterSpacing:"-1px",marginBottom:4}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
      <div style={{fontSize:13,color:c.dim,marginBottom:36}}>Track your investments. Plan your next move.</div>
      <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",gap:0,borderRadius:14,overflow:"hidden",border:"1px solid #E8E8ED"}}>
          <button onClick={()=>{setAuthMode("login");setAuthErr("")}} style={{flex:1,padding:"11px",border:"none",fontSize:14,fontWeight:600,cursor:"pointer",background:authMode==="login"?c.txt:"#F5F5F7",color:authMode==="login"?"#fff":c.dim}}>Login</button>
          <button disabled={!site.signupsEnabled} onClick={()=>{if(!site.signupsEnabled)return;setAuthMode("register");setAuthErr("")}} title={site.signupsEnabled?"":"Signups are paused"} style={{flex:1,padding:"11px",border:"none",fontSize:14,fontWeight:600,cursor:site.signupsEnabled?"pointer":"not-allowed",background:authMode==="register"?c.txt:"#F5F5F7",color:authMode==="register"?"#fff":c.dim,opacity:site.signupsEnabled?1:0.5}}>Register</button>
        </div>
        {!site.signupsEnabled&&<div style={{fontSize:11,color:c.dim,textAlign:"center"}}>New signups are paused right now.</div>}
        {authMode==="register"&&<input type="text" value={authName} onChange={e=>setAuthName(e.target.value.replace(/[^a-zA-Z\s]/g,""))} placeholder="First and last name" autoComplete="name" style={inp_s}/>}
        <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" inputMode="email" style={inp_s}/>
        <input type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="Min 8: Aa1 + special (!@#)" autoComplete={authMode==="login"?"current-password":"new-password"} style={inp_s}/>
        {authErr&&<div style={{padding:"10px",background:"#FFF0F0",color:c.rd,borderRadius:10,fontSize:12,textAlign:"center"}}>{authErr}</div>}
        <button onClick={handleAuth} style={{padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff",marginTop:4}}>{authMode==="login"?"Login":"Create Account"}</button>
        {authMode==="login"&&<div style={{textAlign:"center",marginTop:8}}><span onClick={()=>setScreen("forgotPass")} style={{fontSize:12,color:c.ac,cursor:"pointer",fontWeight:500}}>Forgot password?</span></div>}
      </div>
    </div>)};

  // ── Forgot Password Screen ──
  const ForgotPass=()=>{
    const handleReset=async()=>{
      const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!fpEmail){setFpErr("Enter your email");return}
      if(!emailRegex.test(fpEmail)){setFpErr("Enter a valid email");return}
      // Firebase sends the reset email. We always show success so an attacker
      // can't use this form to discover which emails have accounts.
      const res=await resetPassword(fpEmail.toLowerCase().trim());
      if(!res.success&&res.error&&res.error.indexOf("Network")!==-1){setFpErr(res.error);return}
      setResetSent(true);setFpErr("");
    };
    if(resetSent)return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{width:56,height:56,borderRadius:28,background:c.acd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>✓</div>
      <div style={{fontSize:22,fontWeight:700,marginBottom:8,textAlign:"center"}}>Check your email</div>
      <div style={{fontSize:14,color:c.dim,textAlign:"center",lineHeight:1.55,maxWidth:300,marginBottom:32}}>We've sent password reset instructions to <strong>{fpEmail}</strong></div>
      <button onClick={()=>{setResetSent(false);setScreen("login")}} style={{padding:"14px 36px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Back to Login</button>
    </div>);
    return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{fontSize:32,fontWeight:200,letterSpacing:"-1px",marginBottom:4}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
      <div style={{fontSize:13,color:c.dim,marginBottom:36}}>Reset your password</div>
      <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:14,color:c.dim,lineHeight:1.5,textAlign:"center"}}>Enter your email and we'll send you a link to reset your password.</div>
        <input type="email" value={fpEmail} onChange={e=>setFpEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" inputMode="email" style={inp_s}/>
        {fpErr&&<div style={{padding:"10px",background:"#FFF0F0",color:c.rd,borderRadius:10,fontSize:12,textAlign:"center"}}>{fpErr}</div>}
        <button onClick={handleReset} style={{padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Send Reset Link</button>
        <div style={{textAlign:"center",marginTop:4}}><span onClick={()=>setScreen("login")} style={{fontSize:12,color:c.ac,cursor:"pointer",fontWeight:500}}>Back to Login</span></div>
      </div>
    </div>)};

    // ── Contact Screen (Premium inquiry) ──
  const Contact=()=>{
    if(contactSent)return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"80vh",justifyContent:"center"}}>
      <div style={{width:56,height:56,borderRadius:28,background:c.acd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>✓</div>
      <div style={{fontSize:22,fontWeight:700,marginBottom:8,textAlign:"center"}}>Message sent</div>
      <div style={{fontSize:14,color:c.dim,textAlign:"center",lineHeight:1.55,maxWidth:300,marginBottom:32}}>We'll review your account needs and get back to you within 24 hours.</div>
      <button onClick={()=>{setContactSent(false);setScreen("portfolio")}} style={{padding:"14px 36px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Back to Portfolio</button>
    </div>);
    return(<div>
      {hdr(<button onClick={()=>setScreen("portfolio")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,"Premium Plan",null)}
      <div style={{padding:"20px 18px"}}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Need higher limits?</div>
        <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:20}}>Tell us what you need and we'll create a custom Premium plan for your account. Higher portfolios, more coins, more transactions — tailored to you.</div>
        <div style={{fontSize:12,fontWeight:600,color:c.dim,marginBottom:6}}>Your message</div>
        <textarea value={contactMsg} onChange={e=>setContactMsg(e.target.value)} placeholder={"I need more portfolios / coins / transactions..."} style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid #E8E8ED",fontSize:14,outline:"none",resize:"vertical",minHeight:100,fontFamily:"inherit",boxSizing:"border-box"}}/>
        <div style={{fontSize:11,color:c.dim,marginTop:6,marginBottom:16}}>Account: {user?.email}</div>
        <button onClick={()=>{if(contactMsg.trim())setContactSent(true)}} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Send Request</button>
      </div>
    </div>)};

    // ── Account Screen ──
  const Account=()=>(<div>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <button onClick={()=>setScreen("portfolio")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>
      <span style={{fontSize:17,fontWeight:600}}>Account</span>
      <div style={{width:24}}/>
    </div>

    <div style={{padding:"20px 18px",textAlign:"center"}}>
      <div style={{width:60,height:60,borderRadius:30,background:c.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:600,color:c.dim,margin:"0 auto 10px"}}>{(user?.name||"U").charAt(0).toUpperCase()}</div>
      <div style={{fontSize:18,fontWeight:600}}>{user?.name}</div>
      <div style={{fontSize:13,color:c.dim}}>{user?.email}</div>
      <div style={{display:"inline-flex",padding:"4px 14px",borderRadius:20,background:isPremium?"#AF52DE15":isPro?c.acd:c.yeld,marginTop:8}}>
        <span style={{fontSize:12,fontWeight:700,color:isPremium?"#AF52DE":isPro?c.ac:c.yel}}>{isPremium?"PREMIUM":isPro?"PRO":"STARTER"}</span>
      </div>
    </div>

    {(() => {
      const totalCoinsAllPorts = portfolios.reduce((s,p) => s + p.coins.length, 0);
      const totalTxAllPorts = portfolios.reduce((s,p) => s + p.coins.reduce((cs,c) => cs + (c.entries?.length || 0), 0), 0);
      const maxTotalTx = maxPortfolios * maxCoinsPerPort * maxTxPerCoin;
      const portPct = Math.min(100, (portfolios.length / maxPortfolios) * 100);
      const coinPct = portfolio.length > 0 ? Math.min(100, (portfolio.length / maxCoinsPerPort) * 100) : 0;
      const txPct = Math.min(100, (totalTxAllPorts / maxTotalTx) * 100);
      const barColor = (pct) => pct >= 90 ? c.red : pct >= 70 ? c.yel : c.ac;
      const Bar = ({pct}) => (
        <div style={{height:5,background:"#F0F0F0",borderRadius:3,overflow:"hidden",marginTop:5}}>
          <div style={{width:pct+"%",height:"100%",background:barColor(pct),borderRadius:3,transition:"width 0.3s"}}/>
        </div>
      );
      return (
    <div style={{margin:"0 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Your Plan Usage</div>

      <div style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:c.dim}}>Portfolios</span>
          <span style={{fontSize:13,fontWeight:600}}>{portfolios.length} / {maxPortfolios}</span>
        </div>
        <Bar pct={portPct}/>
      </div>

      <div style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:c.dim}}>Coins in active portfolio</span>
          <span style={{fontSize:13,fontWeight:600}}>{portfolio.length} / {maxCoinsPerPort}</span>
        </div>
        <Bar pct={coinPct}/>
      </div>

      <div style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:c.dim}}>Total transactions</span>
          <span style={{fontSize:13,fontWeight:600}}>{totalTxAllPorts.toLocaleString()} / {maxTotalTx.toLocaleString()}</span>
        </div>
        <Bar pct={txPct}/>
        <div style={{fontSize:10,color:c.dim,marginTop:4}}>Up to {maxTxPerCoin.toLocaleString()} per coin</div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
        <span style={{fontSize:13,color:c.dim}}>Joined</span>
        <span style={{fontSize:13,fontWeight:600}}>{user?.joined}</span>
      </div>

      {/* Active subscription — show renewal date */}
      {isPro&&user?.subscription?.endDate&&!user?.subscription?.cancelled&&!user?.subscription?.paymentFailed&&(
        <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:c.acd,fontSize:11,color:c.ac,textAlign:"center",fontWeight:600,lineHeight:1.5}}>
          Your {user.tier==="premium"?"Premium":"Pro"} subscription renews on<br/>{fmtDate(user.subscription.endDate)}
        </div>
      )}

      {/* Payment failed — 7-day grace period */}
      {user?.subscription?.paymentFailed&&user?.subscription?.paymentFailedDate&&(()=>{
        const failed=new Date(user.subscription.paymentFailedDate);
        const daysLeft=Math.max(0,7-Math.floor((new Date()-failed)/(1000*60*60*24)));
        return(
          <div style={{marginTop:10,padding:"12px 14px",borderRadius:10,background:"#FFF0F0",border:"1px solid #FFD0D0",textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:c.red,marginBottom:4}}>⚠ PAYMENT FAILED</div>
            <div style={{fontSize:12,color:c.red,fontWeight:600,lineHeight:1.5,marginBottom:8}}>
              Your account will downgrade to Starter in <strong>{daysLeft} day{daysLeft!==1?"s":""}</strong>
            </div>
            <div style={{fontSize:11,color:c.dim,lineHeight:1.5}}>
              Update your payment method to keep your {user.tier==="premium"?"Premium":"Pro"} access
            </div>
          </div>
        );
      })()}

      {/* Cancelled subscription — show end date */}
      {user?.subscription?.cancelled&&user?.subscription?.endDate&&(
        <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"#FFF0F0",fontSize:11,color:c.red,textAlign:"center",fontWeight:600,lineHeight:1.5}}>
          Your {user.tier==="premium"?"Premium":"Pro"} access ends on<br/>{fmtDate(user.subscription.endDate)}<br/>
          <span style={{fontWeight:400,color:c.dim}}>Then your account will become {user.subscription.downgradeTo==="free"?"Starter":"Pro"}</span>
        </div>
      )}

      {!isPro&&<button onClick={()=>startUpgrade("pro")} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:c.ac,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:10}}>Upgrade to Pro</button>}
      {isPro&&!isPremium&&<button onClick={()=>startUpgrade("premium")} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"#AF52DE",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:10}}>Upgrade to Premium</button>}
      {isPro&&!isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("free")} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.dim,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:8}}>Cancel Pro · Switch to Starter</button>}
      {isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("pro")} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.dim,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:8}}>Downgrade to Pro</button>}
    </div>
      );
    })()}

    {/* Portfolio Manager */}
    <div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:600}}>Portfolios ({portfolios.length}/{maxPortfolios})</span>
      </div>
      {portfolios.map(p=>(
        <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
          <div onClick={()=>{setActivePortId(p.id);setScreen("portfolio")}} style={{cursor:"pointer",flex:1}}>
            <div style={{fontSize:14,fontWeight:p.id===activePortId?700:500,color:p.id===activePortId?c.ac:c.txt}}>{p.name}</div>
            <div style={{fontSize:11,color:c.dim}}>{p.coins.length} coins{p.id===activePortId?" · Active":""}</div>
          </div>
          {portfolios.length>1&&<button onClick={()=>deletePortfolio(p.id)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>{Ic.trash}</button>}
        </div>
      ))}

      <div style={{display:"flex",gap:8,marginTop:12}}>
        <input type="text" value={newPortName} onChange={e=>setNewPortName(e.target.value)} placeholder="New portfolio name" style={{...inp_s,flex:1}}/>
        <button onClick={addPortfolio} style={{padding:"10px 16px",borderRadius:12,border:"none",background:c.txt,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
      </div>
    </div>

    {/* Admin lives in a separate app at /admin (admin.html) — intentionally not in the user app. */}

    {/* Privacy & your data (GDPR/CCPA self-service) */}
    <div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16,border:"1px solid #E8E8ED"}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Privacy & your data</div>
      <div style={{fontSize:11,color:c.dim,marginBottom:12,lineHeight:1.5}}>Download everything we hold about you, or permanently delete your account and all your data.</div>
      <button onClick={downloadMyData} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:8}}>{acctBusy?"…":"Download my data"}</button>
      {delConfirm?(
        <button onClick={deleteMyAccount} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:c.red,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Yes, permanently delete my account</button>
      ):(
        <button onClick={()=>setDelConfirm(true)} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid "+c.red,background:c.redd,color:c.red,fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete my account</button>
      )}
      {acctMsg&&<div style={{textAlign:"center",marginTop:10,fontSize:12,color:c.dim,fontWeight:600}}>{acctMsg}</div>}
      <div style={{fontSize:11,marginTop:12,textAlign:"center"}}>
        <a href="/privacy.html" style={{color:c.ac,textDecoration:"none"}}>Privacy Policy</a> · <a href="/terms.html" style={{color:c.ac,textDecoration:"none"}}>Terms</a>
      </div>
    </div>

    <div style={{padding:"20px 18px"}}>
      <button onClick={logout} style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid "+c.red,background:c.redd,color:c.red,fontSize:14,fontWeight:600,cursor:"pointer"}}>Logout</button>
    </div>
  </div>);

  // ── Portfolio Selector (mini bar) ──
  const PortfolioBar=()=>portfolios.length>1||isPro?(
    <div style={{padding:"6px 18px 2px",display:"flex",gap:6,overflowX:"auto"}}>
      {portfolios.map(p=>(
        <button key={p.id} onClick={()=>setActivePortId(p.id)} style={{padding:"6px 14px",borderRadius:20,border:p.id===activePortId?"1.5px solid "+c.ac:"1.5px solid #E8E8ED",background:p.id===activePortId?c.acd:"#fff",fontSize:11,fontWeight:600,color:p.id===activePortId?c.ac:c.dim,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{p.name}</button>
      ))}
      {portfolios.length<maxPortfolios&&<button onClick={()=>setScreen("account")} style={{padding:"6px 10px",borderRadius:20,border:"1.5px dashed #E8E8ED",background:"none",fontSize:11,color:c.dim,cursor:"pointer",flexShrink:0}}>+</button>}
    </div>
  ):null;

  // ── Search ──
  const Search=()=>(<>
    {hdr(<button onClick={()=>{setScreen("portfolio");setSq("")}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,"Add Coin")}
    <div style={{padding:"6px 18px 10px"}}><input type="text" value={sq} onChange={e=>setSq(e.target.value)} placeholder="Search coins... (Bitcoin, ETH, SOL...)" style={inp_s} autoFocus/></div>
    {searchResults.length>0?searchResults.map(coin=>{const ad=portfolio.find(x=>x.id===coin.id);return(<div key={coin.id} style={{display:"flex",alignItems:"center",padding:"10px 18px",gap:11,opacity:ad?0.4:1}}><CI thumb={coin.thumb} symbol={coin.symbol} size={36}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coin.name}</div><div style={{fontSize:11,color:c.dim}}>{coin.symbol}{coin.rank?" · #"+coin.rank:""}</div></div>{coin.mockPrice!=null&&<span style={{fontSize:12,fontWeight:600,marginRight:6}}>{fmtP(coin.mockPrice)}</span>}<button onClick={()=>!ad&&addCoin(coin)} disabled={ad} style={sb(ad?c.inp:c.ac,ad?c.dim:c.bg)}>{ad?"Added":"+ Add"}</button></div>)}):sq.length>=1?(<div style={{textAlign:"center",padding:"36px",color:c.dim,fontSize:13}}>No results for "{sq}"</div>):(<div style={{textAlign:"center",padding:"44px 36px",color:c.dim}}><div style={{fontSize:38,marginBottom:10}}>🔍</div><div style={{fontSize:14,fontWeight:500,color:c.txt,marginBottom:5}}>Search any coin</div><div style={{fontSize:12,lineHeight:1.5}}>Type to find any coin, live</div></div>)}
  </>);

  // ── Detail ──
  const Detail=()=>{if(!sel)return null;const coin=portfolio.find(x=>x.id===sel.id)||sel;const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const mc=p?.usd_market_cap;const h=Math.max(0,coin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0));const buysCost=coin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount*e.priceAtBuy,0);const sellsGain=coin.entries.filter(e=>e.type==="sell").reduce((s,e)=>s+e.amount*e.priceAtBuy,0);const inv=buysCost-sellsGain;const v=h*(pr||0);const pnl=v-inv;const pp=inv>0?(pnl/inv)*100:0;const totalPnl=(v+sellsGain)-buysCost;const totalPnlPct=buysCost>0?((v+sellsGain-buysCost)/buysCost)*100:0;
  return(<>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><button onClick={()=>{setScreen("portfolio");setSel(null);setConfirmDel(false)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button><span style={{fontSize:17,fontWeight:600}}>{coin.name}</span>{!confirmDel?<button onClick={()=>setConfirmDel(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>{Ic.trash}</button>:<button onClick={()=>{remCoin(coin.id);setConfirmDel(false)}} style={{padding:"5px 12px",borderRadius:8,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:c.red,color:"#fff",animation:"fadeIn 0.15s"}}>Remove</button>}</div>
    <div style={{margin:"8px 16px",background:c.card,borderRadius:18,padding:"20px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}}><CI thumb={coin.thumb} symbol={coin.symbol} size={40}/><span style={{fontSize:14,fontWeight:600,color:c.dim}}>{coin.symbol}</span></div>
      <div style={{fontSize:28,fontWeight:700}}>{fmtP(pr)}</div>
      <div style={{fontSize:13,fontWeight:600,color:ch>=0?c.ac:c.red,marginTop:3}}>{fmtPct(ch)} (24h)</div>
      {mc>0&&<div style={{fontSize:11,color:c.dim,marginTop:6}}>Market Cap: {fmtMc(mc)}</div>}
    </div>
    <div style={{margin:"0 18px",display:"flex",flexDirection:"column",gap:0,paddingBottom:10,borderBottom:`1px solid ${c.bdr}`}}>
      {(()=>{const boughtCoins=coin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount,0);const soldCoins=coin.entries.filter(e=>e.type==="sell").reduce((s,e)=>s+e.amount,0);const avgBuy=boughtCoins>0?buysCost/boughtCoins:0;const avgSell=soldCoins>0?sellsGain/soldCoins:0;return(<>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Holding</span><span style={{fontWeight:700,fontSize:14}}>{h.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Current Value</span><span style={{fontWeight:700,fontSize:14}}>${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      <div style={{height:1,background:c.bdr,margin:"4px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Bought</span><span style={{fontWeight:600,fontSize:13}}>{boughtCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span style={{color:c.dim,fontWeight:400}}>· ${buysCost.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
      {avgBuy>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:c.dim,fontSize:11}}>Avg Buy Price</span><span style={{fontSize:12,color:c.dim}}>{fmtP(avgBuy)}</span></div>}
      {soldCoins>0&&<><div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Sold</span><span style={{fontWeight:600,fontSize:13,color:c.red}}>{soldCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span style={{color:c.ac,fontWeight:400}}>· ${sellsGain.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:c.dim,fontSize:11}}>Avg Sell Price</span><span style={{fontSize:12,color:c.dim}}>{fmtP(avgSell)}</span></div></>}
      <div style={{height:1,background:c.bdr,margin:"4px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",background:totalPnl>=0?c.acd:c.redd,borderRadius:10,paddingLeft:10,paddingRight:10,marginTop:4}}><span style={{fontSize:13,fontWeight:600}}>Total P/L</span><span style={{fontWeight:700,fontSize:14,color:totalPnl>=0?c.ac:c.red}}>{totalPnl>=0?"+":""}${Math.abs(totalPnl).toLocaleString("en-US",{minimumFractionDigits:2})} ({fmtPct(totalPnlPct)})</span></div>
      {sellsGain>buysCost&&<div style={{padding:"6px 10px",background:c.acd,borderRadius:8,fontSize:11,color:c.ac,marginTop:6}}>Sell proceeds exceed buy costs — you already profited more than your total investment</div>}
      </>)})()}
    </div>
    <div style={{padding:"12px 18px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:600}}>Transactions ({coin.entries.length})</span><div style={{display:"flex",gap:6}}><button onClick={()=>{setEditEntry(null);setETxType("buy");const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=hp&&hp>0?(hp>=1?hp.toFixed(2):hp>=0.0001?hp.toFixed(6):hp>=0.0000001?hp.toFixed(10):hp.toFixed(12)):(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")}} style={sb(c.ac,c.bg)}>+ Buy</button><button onClick={()=>{setEditEntry(null);setETxType("sell");const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=hp&&hp>0?(hp>=1?hp.toFixed(2):hp>=0.0001?hp.toFixed(6):hp>=0.0000001?hp.toFixed(10):hp.toFixed(12)):(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")}} style={sb(c.redd,c.red)}>- Sell</button></div></div>
    {coin.entries.length===0?(<div style={{textAlign:"center",padding:"20px",color:c.dim,fontSize:12}}>No transactions yet.</div>):[...coin.entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const isSell=e.type==="sell";return(<div key={e.id} onClick={()=>{setEditEntry(e);setEAmt(e.amount.toString());setEPrice(e.priceAtBuy.toString());setEDate(e.date);setETxType(e.type||"buy");setScreen("addEntry")}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 18px",borderBottom:"1px solid #F0F0F0",cursor:"pointer"}}><div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:isSell?c.redd:c.acd,color:isSell?c.red:c.ac}}>{isSell?"SELL":"BUY"}</span><span style={{fontSize:13,fontWeight:600}}>{e.amount.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div><div style={{fontSize:11,color:c.dim,marginTop:2,display:"flex",alignItems:"center",gap:4}}>{Ic.clock} {fmtDT(e.date)}</div><div style={{fontSize:10,color:c.dim}}>Price: {fmtP(e.priceAtBuy)} · {isSell?"Received":"Cost"}: ${(e.amount*e.priceAtBuy).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div><button onClick={(ev)=>{ev.stopPropagation();remEntry(coin.id,e.id)}} style={{background:"none",border:"none",cursor:"pointer",padding:6}}>{Ic.trash}</button></div>)})}
  </>)};

  // ── Add Entry ──
  const AddEntry=()=>{
    const coinData=sel?TOP_COINS.find(x=>x.id===sel.id):null;
    const launchDate=coinData?.launch||"2013-04-28";
    const launchDateTime=launchDate+"T00:00";
    const fmtPriceInput=(p)=>{if(!p||p<=0)return"";if(p>=1)return p.toFixed(2);if(p>=0.0001)return p.toFixed(6);if(p>=0.0000001)return p.toFixed(10);return p.toFixed(12)};
    const onDateChange=(newDate)=>{
      if(!newDate)return;
      const picked=new Date(newDate);
      const launch=new Date(launchDate);
      if(picked<launch){
        setEDate(launchDateTime);
        const hp=getHistoricalPrice(sel.id,launch);
        const formatted=fmtPriceInput(hp);
        if(formatted){setEPrice(formatted)}
        return;
      }
      setEDate(newDate);
      if(sel){const hp=getHistoricalPrice(sel.id,new Date(newDate));const fmt=fmtPriceInput(hp);if(fmt){setEPrice(fmt)}}
    };
    const histPrice=sel?getHistoricalPrice(sel.id,new Date(eDate)):null;
    const priceIsHist=histPrice&&ePrice&&Math.abs(parseFloat(ePrice)-histPrice)/histPrice<0.15;
    const isBeforeLaunch=eDate&&new Date(eDate)<new Date(launchDate);
    return(<>
    {hdr(<button onClick={()=>{setScreen("detail");setEditEntry(null)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,editEntry?"Edit Transaction":"New Transaction")}
    <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setETxType("buy")} style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${eTxType==="buy"?c.ac:c.bdr}`,background:eTxType==="buy"?c.ac:c.inp,color:eTxType==="buy"?c.bg:c.dim,fontSize:14,fontWeight:700,cursor:"pointer"}}>Buy</button>
        <button onClick={()=>setETxType("sell")} style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${eTxType==="sell"?c.red:c.bdr}`,background:eTxType==="sell"?c.red:c.inp,color:eTxType==="sell"?"#fff":c.dim,fontSize:14,fontWeight:700,cursor:"pointer"}}>Sell</button>
      </div>
      <div><label style={lbl_s}>Amount ({sel?.symbol})</label><input type="number" step="any" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00" style={inp_s}/></div>
      <div><label style={lbl_s}>Price per coin (USD) {histPrice?<span style={{color:c.ac,fontWeight:600}}>· auto-filled</span>:""}</label><input type="number" step="any" value={ePrice} onChange={e=>setEPrice(e.target.value)} placeholder="0.00" style={inp_s}/>
        {histPrice&&!priceIsHist&&<div style={{fontSize:10,color:c.yel,marginTop:4}}>Suggested price: {fmtP(histPrice)}</div>}
      </div>
      <div><label style={lbl_s}>Date & Time <span style={{color:c.dim,fontWeight:400}}>· available from {launchDate}</span></label><input type="datetime-local" step="1" value={eDate} min={launchDateTime} onChange={e=>onDateChange(e.target.value)} style={inp_s}/>
        {isBeforeLaunch&&<div style={{fontSize:11,color:c.yel,marginTop:5,display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>⚠️</span>{sel?.name} launched on {launchDate}. Date adjusted to earliest available.</div>}
      </div>
      {eAmt&&ePrice&&(<div style={{padding:"10px 14px",background:c.acd,borderRadius:12,fontSize:13}}>{eTxType==="sell"?"Sell value":"Total cost"}: <strong>${(parseFloat(eAmt||0)*parseFloat(ePrice||0)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>)}
      <button onClick={addEntry} disabled={!eAmt||!ePrice} style={{padding:"13px",borderRadius:12,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",width:"100%",background:eTxType==="sell"?c.red:c.ac,color:eTxType==="sell"?"#fff":c.bg,opacity:(!eAmt||!ePrice)?0.4:1}}>{editEntry?"Save Changes":eTxType==="sell"?"Add Sell":"Add Buy"}</button>
    </div>
  </>);};

  // ── Coin Info ──
  const CoinInfo=()=>{
    if(!infoCoin)return null;
    const coin=infoCoin;
    const cd=TOP_COINS.find(x=>x.id===coin.id);
    const p=prices[coin.id];
    const pr=p?.usd||cd?.mockPrice||0;
    const ch=p?.usd_24h_change||cd?.mockChange||0;
    const mc=p?.usd_market_cap||cd?.mockMcap||0;
    const portCoin=portfolio.find(x=>x.id===coin.id);
    const holdings=portCoin?Math.max(0,portCoin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0)):0;
    const holdValue=holdings*pr;
    const rank=cd?.rank||"—";
    const launchDate=cd?.launch||"Unknown";

    return(<>
      <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={()=>{setScreen("portfolio");setInfoCoin(null)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>
        <span style={{fontSize:17,fontWeight:600}}>{coin.name}</span>
        <button onClick={()=>{setSel(portCoin||coin);setScreen("detail");setInfoCoin(null)}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #E8E8ED",background:"none",fontSize:11,fontWeight:600,color:c.txt,cursor:"pointer"}}>Transactions</button>
      </div>

      {/* Price Header */}
      <div style={{padding:"20px 18px 16px",textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,marginBottom:12}}>
          <CI thumb={coin.thumb} symbol={coin.symbol} size={48}/>
        </div>
        <div style={{fontSize:11,color:c.dim,marginBottom:4}}>{coin.symbol} · Rank #{rank}</div>
        <div style={{fontSize:36,fontWeight:200,letterSpacing:"-1.5px"}}>{fmtP(pr)}</div>
        <div style={{display:"inline-flex",padding:"4px 14px",borderRadius:20,background:ch>=0?c.acd:c.redd,marginTop:8}}>
          <span style={{fontSize:14,fontWeight:600,color:ch>=0?c.ac:c.red}}>{fmtPct(ch)} (24h)</span>
        </div>
      </div>

      {/* Market Data */}
      <div style={{margin:"0 18px",padding:"16px",background:c.card,borderRadius:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Market Data</div>
        {[
          ["Market Cap",fmtMc(mc)],
          ["Rank","#"+rank],
          ["First tracked",launchDate],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F0F0F0"}}>
            <span style={{fontSize:13,color:c.dim}}>{k}</span>
            <span style={{fontSize:13,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>

      {/* Your Position */}
      {portCoin&&<div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Your Position</div>
        {[
          ["Holdings",holdings.toLocaleString("en-US",{maximumFractionDigits:8})+" "+coin.symbol],
          ["Value","$"+holdValue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})],
          ["Transactions",portCoin.entries.length.toString()],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F0F0F0"}}>
            <span style={{fontSize:13,color:c.dim}}>{k}</span>
            <span style={{fontSize:13,fontWeight:600}}>{v}</span>
          </div>
        ))}
        <button onClick={()=>{setSel(portCoin);setScreen("detail");setInfoCoin(null)}} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:c.txt,color:c.bg,fontSize:14,fontWeight:600,cursor:"pointer",marginTop:12}}>View Transactions</button>
      </div>}

      {/* Price at key dates */}
      {cd&&PRICE_HISTORY[coin.id]&&<div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Price History</div>
        {(()=>{
          const hist=PRICE_HISTORY[coin.id];
          if(!hist||hist.length===0)return null;
          const milestones=[];
          const now=new Date();
          const periods=[
            {label:"Launch",date:new Date(cd.launch)},
            {label:"1 Year Ago",date:new Date(now.getFullYear()-1,now.getMonth(),now.getDate())},
            {label:"6 Months Ago",date:new Date(now.getFullYear(),now.getMonth()-6,now.getDate())},
            {label:"3 Months Ago",date:new Date(now.getFullYear(),now.getMonth()-3,now.getDate())},
            {label:"Today",date:now},
          ];
          return periods.filter(p=>p.date>=new Date(cd.launch)).map(p=>{
            const price=getHistoricalPrice(coin.id,p.date);
            if(!price)return null;
            const changeFromNow=pr>0?((pr-price)/price)*100:0;
            return(
              <div key={p.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F0F0F0"}}>
                <span style={{fontSize:12,color:c.dim}}>{p.label}</span>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:12,fontWeight:600}}>{fmtP(price)}</span>
                  {p.label!=="Today"&&<span style={{fontSize:10,marginLeft:6,color:changeFromNow>=0?c.ac:c.red}}>{fmtPct(changeFromNow)}</span>}
                </div>
              </div>
            );
          });
        })()}
      </div>}
    </>);
  };

  const at=(screen==="addEntry"||screen==="detail"||screen==="coinInfo"||screen==="account")?"portfolio":screen;

  if(site.maintenance) return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:c.bg,color:c.txt,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px"}}>
    <div style={{fontSize:40,marginBottom:14}}>🛠️</div>
    <div style={{fontSize:24,fontWeight:700,marginBottom:8}}>We'll be right back</div>
    <div style={{fontSize:14,color:c.dim,maxWidth:320,lineHeight:1.5}}>Crypto Idea is briefly down for maintenance. Your data is safe — please check back in a little while.</div>
  </div>);

  return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:c.bg,color:c.txt,minHeight:"100vh",maxWidth:430,margin:"0 auto",paddingBottom:78,WebkitFontSmoothing:"antialiased"}}>
    {err&&<div style={{margin:"8px 16px",padding:"10px 14px",background:"#FFF0F0",color:c.red,borderRadius:12,fontSize:12,fontWeight:500,border:"1px solid #FFD0D0"}}>{err}</div>}
    {showPlan&&screen!=="login"&&(()=>{
      // Reuse the Login() flow rendering for upgrade overlay
      // But Login() handles the showPlan branch — render it as a full overlay
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:c.bg,zIndex:9000,maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
        {Login()}
      </div>);
    })()}
    {screen==="loading"&&Loading()}
    {screen==="login"&&Login()}
    {screen==="forgotPass"&&ForgotPass()}
    {screen==="contact"&&Contact()}
    {downgradeTo&&(()=>{
      const impact=getTrimImpact(downgradeTo);
      const endDate=user?.subscription?.endDate||calcEndDate(user?.subscription?.billing||"monthly");
      const targetLabel=downgradeTo==="free"?"Starter":"Pro";
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}}>
        <div style={{background:"#fff",borderTopLeftRadius:24,borderTopRightRadius:24,padding:"24px 22px 32px",width:"100%",maxWidth:430}}>
          <div style={{width:36,height:4,background:"#E8E8ED",borderRadius:2,margin:"0 auto 18px"}}/>
          <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Downgrade to {targetLabel}?</div>
          <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:18}}>Your subscription is paid until the end of the period. You'll keep your current access until then. After that date, your account will be downgraded.</div>

          <div style={{padding:"12px 14px",borderRadius:12,background:"#FFF0F0",border:"1px solid #FFE0E0",marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:c.red,marginBottom:4}}>SUBSCRIPTION ENDS</div>
            <div style={{fontSize:15,fontWeight:700,color:c.red}}>{fmtDate(endDate)}</div>
            <div style={{fontSize:11,color:c.dim,marginTop:4}}>You'll have full access until this date</div>
          </div>

          {impact&&(impact.portsToDelete>0||impact.coinsToDelete>0||impact.txToDelete>0)&&(
            <div style={{padding:"14px",borderRadius:12,background:"#FFF8E1",border:"1px solid #FFE082",marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#F59E0B",marginBottom:8}}>⚠ DATA THAT WILL BE DELETED</div>
              <div style={{fontSize:12,color:"#92400E",lineHeight:1.7}}>
                After {fmtDate(endDate)}, your account limit will drop to {targetLabel}. The following will be removed:
                {impact.portsToDelete>0&&<div>• {impact.portsToDelete} portfolio{impact.portsToDelete>1?"s":""}</div>}
                {impact.coinsToDelete>0&&<div>• {impact.coinsToDelete} coin{impact.coinsToDelete>1?"s":""}</div>}
                {impact.txToDelete>0&&<div>• {impact.txToDelete.toLocaleString()} transaction{impact.txToDelete>1?"s":""}</div>}
              </div>
              <div style={{fontSize:11,color:c.dim,marginTop:8,fontStyle:"italic"}}>The oldest items will be removed. Your most recent data will be kept.</div>
            </div>
          )}

          <div style={{fontSize:11,color:c.dim,lineHeight:1.6,marginBottom:16,textAlign:"center"}}>No refunds. Your subscription remains active until the end of the paid period.</div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setDowngradeTo(null)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>Keep My Plan</button>
            <button onClick={confirmDowngrade} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.red,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Confirm Downgrade</button>
          </div>
        </div>
      </div>);
    })()}
    {screen==="account"&&Account()}
    {screen==="portfolio"&&Portfolio()}
    {screen==="search"&&Search()}
    {screen==="detail"&&Detail()}
    {screen==="addEntry"&&AddEntry()}
    {screen==="coinInfo"&&CoinInfo()}
    {screen!=="login"&&screen!=="loading"&&screen!=="forgotPass"&&screen!=="contact"&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,display:"flex",background:"rgba(255,255,255,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid #E8E8ED",padding:"6px 0 22px",zIndex:100}}>
      {[{id:"portfolio",label:"Portfolio",icon:Ic.port},{id:"search",label:"Search",icon:Ic.srch}].map(tab=>(<button key={tab.id} onClick={()=>setScreen(tab.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 0",cursor:"pointer",border:"none",background:"none",fontSize:10,fontWeight:600,color:at===tab.id?c.ac:c.dim}}>{tab.icon(at===tab.id)}{tab.label}</button>))}
    </div>}
  </div>);
}
