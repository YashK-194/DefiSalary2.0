"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const ContractInfo = ({ contract, connectedAccount, isReadOnly = false }) => {
  const [contractData, setContractData] = useState({
    balance: null,
    employeeCount: 0,
    ethPrice: null,
    owner: null,
    contractAddress: null,
  });
  const [loading, setLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    if (contract) {
      fetchContractInfo();
      getNetworkInfo();
    }
  }, [contract]);

  const fetchContractInfo = async () => {
    if (!contract) return;

    try {
      setLoading(true);

      const [balance, employeeCount, ethPrice, owner] = await Promise.all([
        contract.getContractBalance(),
        contract.getEmployeesCount(),
        contract.getLatestETHPrice(),
        contract.owner(),
      ]);

      setContractData({
        balance: ethers.formatEther(balance),
        employeeCount: Number(employeeCount),
        ethPrice: ethers.formatUnits(ethPrice, 18),
        owner: owner,
        contractAddress: contract.target || contract.address,
      });
    } catch (error) {
      console.error("Error fetching contract info:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNetworkInfo = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkInfo({
          name:
            network.name === "unknown"
              ? `Chain ID: ${network.chainId}`
              : network.name,
          chainId: Number(network.chainId),
        });
      } catch (error) {
        console.error("Error getting network info:", error);
      }
    }
  };

  const formatAddress = (address) => {
    if (!address) return "Loading...";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Copied to clipboard!");
      })
      .catch(() => {
        alert("Failed to copy to clipboard");
      });
  };

  const addTokenToWallet = async () => {
    if (!contractData.contractAddress) return;

    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: contractData.contractAddress,
            symbol: "DSAL",
            decimals: 18,
            image: "", // You can add a token image URL here
          },
        },
      });
    } catch (error) {
      console.error("Error adding token to wallet:", error);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Contract Information
          </h2>
          {isReadOnly && (
            <p className="text-sm text-blue-600 mt-1">📖 Read-only mode</p>
          )}
        </div>
        <button
          onClick={fetchContractInfo}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Network Info */}
      {networkInfo && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
            Network Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-600">Network:</p>
              <p className="font-semibold text-blue-900">{networkInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Chain ID:</p>
              <p className="font-semibold text-blue-900">
                {networkInfo.chainId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contract Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
            Contract Balance
          </h3>
          <p className="text-xl font-bold text-green-900">
            {contractData.balance
              ? `${parseFloat(contractData.balance).toFixed(4)} ETH`
              : "Loading..."}
          </p>
          {contractData.balance && contractData.ethPrice && (
            <p className="text-sm text-green-600">
              ≈ $
              {(
                parseFloat(contractData.balance) *
                parseFloat(contractData.ethPrice)
              ).toFixed(2)}{" "}
              USD
            </p>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
            ETH Price
          </h3>
          <p className="text-xl font-bold text-blue-900">
            $
            {contractData.ethPrice
              ? parseFloat(contractData.ethPrice).toFixed(2)
              : "Loading..."}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide">
            Total Employees
          </h3>
          <p className="text-xl font-bold text-purple-900">
            {contractData.employeeCount}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-600 uppercase tracking-wide">
            Your Role
          </h3>
          <p className="text-xl font-bold text-yellow-900">
            {contractData.owner && connectedAccount
              ? contractData.owner.toLowerCase() ===
                connectedAccount.toLowerCase()
                ? "Owner"
                : "User"
              : "Loading..."}
          </p>
        </div>
      </div>

      {/* Contract Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Contract Details
        </h3>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Contract Address:</p>
                <p className="font-mono text-sm text-gray-900">
                  {formatAddress(contractData.contractAddress)}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(contractData.contractAddress)}
                className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded transition-colors"
              >
                Copy
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Contract Owner:</p>
                <p className="font-mono text-sm text-gray-900">
                  {formatAddress(contractData.owner)}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(contractData.owner)}
                className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded transition-colors"
              >
                Copy
              </button>
            </div>

            {connectedAccount && (
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Your Address:</p>
                  <p className="font-mono text-sm text-gray-900">
                    {formatAddress(connectedAccount)}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(connectedAccount)}
                  className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold py-1 px-3 rounded transition-colors"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Actions */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() =>
              window.open(
                `https://sepolia.etherscan.io/address/${contractData.contractAddress}`,
                "_blank"
              )
            }
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            View on Etherscan
          </button>

          <button
            onClick={addTokenToWallet}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Add to Wallet
          </button>
        </div>

        {/* Contract Description */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">
            About DeFi Salary Contract
          </h4>
          <p className="text-sm text-gray-600">
            This smart contract automates salary payments using ETH and USD
            price feeds. It allows companies to manage employees, set
            USD-denominated salaries, and automatically convert and pay salaries
            in ETH based on current market prices. The contract uses Chainlink
            price feeds for accurate ETH/USD conversion rates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractInfo;
