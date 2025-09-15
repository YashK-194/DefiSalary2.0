import { ethers } from "ethers";

// Network configuration
export const SUPPORTED_NETWORKS = {
  11155111: {
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/",
    blockExplorer: "https://sepolia.etherscan.io",
  },
  1337: {
    name: "Localhost",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: null,
  },
  31337: {
    name: "Hardhat",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: null,
  },
};

// Format address for display
export const formatAddress = (address) => {
  if (!address) return "N/A";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format ETH amount for display
export const formatEth = (amount, decimals = 4) => {
  if (!amount) return "0";
  return parseFloat(ethers.formatEther(amount)).toFixed(decimals);
};

// Format USD amount for display
export const formatUsd = (amount, decimals = 2) => {
  if (!amount) return "0";
  return parseFloat(amount).toFixed(decimals);
};

// Convert timestamp to readable date
export const formatDate = (timestamp) => {
  if (!timestamp || timestamp === 0) return "Never";
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

// Check if address is valid
export const isValidAddress = (address) => {
  return ethers.isAddress(address);
};

// Get network info
export const getNetworkInfo = (chainId) => {
  return SUPPORTED_NETWORKS[chainId] || null;
};

// Copy to clipboard utility
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

// Calculate USD to ETH conversion
export const usdToEth = (usdAmount, ethPrice) => {
  if (!usdAmount || !ethPrice || ethPrice === 0) return 0;
  return parseFloat(usdAmount) / parseFloat(ethPrice);
};

// Calculate ETH to USD conversion
export const ethToUsd = (ethAmount, ethPrice) => {
  if (!ethAmount || !ethPrice) return 0;
  return parseFloat(ethAmount) * parseFloat(ethPrice);
};

// Format large numbers with commas
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Validate form inputs
export const validateEmployeeForm = (name, walletAddress, salaryUSD) => {
  const errors = {};

  if (!name || name.trim().length === 0) {
    errors.name = "Name is required";
  }

  if (!walletAddress || !isValidAddress(walletAddress)) {
    errors.walletAddress = "Valid wallet address is required";
  }

  if (!salaryUSD || parseFloat(salaryUSD) <= 0) {
    errors.salaryUSD = "Salary must be greater than 0";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Transaction error handler
export const handleTransactionError = (error) => {
  console.error("Transaction error:", error);

  if (error.reason) {
    return error.reason;
  } else if (error.message) {
    if (error.message.includes("user rejected")) {
      return "Transaction was rejected by user";
    } else if (error.message.includes("insufficient funds")) {
      return "Insufficient funds for transaction";
    } else if (error.message.includes("execution reverted")) {
      return "Transaction failed - check contract conditions";
    }
    return error.message;
  }

  return "Unknown transaction error occurred";
};

// Local storage utilities
export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    return false;
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Failed to get from localStorage:", error);
    return defaultValue;
  }
};

// Wallet connection utilities
export const checkMetaMaskConnection = async () => {
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask is not installed");
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    throw new Error("Failed to check MetaMask connection");
  }
};

// Network switching utility
export const switchNetwork = async (chainId) => {
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask is not installed");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error) {
    if (error.code === 4902) {
      // Network doesn't exist, might need to add it
      throw new Error("Network not found in wallet");
    }
    throw error;
  }
};
