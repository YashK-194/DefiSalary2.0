"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const WalletConnect = ({
  onConnect,
  onDisconnect,
  connectedAccount,
  setConnectedAccount,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    // Only fetch balance if already connected, don't auto-connect
    if (connectedAccount) {
      fetchBalance();
    }
  }, [connectedAccount]);

  const checkConnection = async () => {
    // This function can be called manually if needed, but won't auto-run
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          onConnect(accounts[0]);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }
  };

  const switchToSepolia = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is required to switch networks");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xAA36A7" }], // Sepolia chain ID in hex
      });
    } catch (error) {
      if (error.code === 4902) {
        // Network doesn't exist, add it
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xAA36A7",
                chainName: "Sepolia Test Network",
                nativeCurrency: {
                  name: "SepoliaETH",
                  symbol: "SEP",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);
          alert("Failed to add Sepolia network");
        }
      } else {
        console.error("Error switching to Sepolia:", error);
        alert("Failed to switch to Sepolia network");
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is required to use this application");
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        setConnectedAccount(accounts[0]);
        onConnect(accounts[0]);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setConnectedAccount(null);
    setBalance(null);
    onDisconnect();
  };

  const fetchBalance = async () => {
    if (connectedAccount && typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(connectedAccount);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Wallet Connection
      </h2>

      {!connectedAccount ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Connect your wallet to interact with the DeFi Salary contract
          </p>
          <div className="space-y-3">
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full sm:w-auto"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            <div className="text-sm text-gray-500">
              <p>Need to switch to Sepolia?</p>
              <button
                onClick={switchToSepolia}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-4 rounded-lg transition-colors mt-2"
              >
                Switch to Sepolia Network
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connected Account:</p>
              <p className="font-mono text-lg text-gray-800">
                {formatAddress(connectedAccount)}
              </p>
            </div>
            <button
              onClick={disconnectWallet}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>

          {balance && (
            <div>
              <p className="text-sm text-gray-600">ETH Balance:</p>
              <p className="text-lg font-semibold text-gray-800">
                {parseFloat(balance).toFixed(4)} ETH
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchBalance}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
            >
              Refresh Balance
            </button>
            <button
              onClick={switchToSepolia}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
            >
              Switch to Sepolia
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
