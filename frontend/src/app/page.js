"use client";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import ABI from "@/app/constants/CONTRACT_ABI.json";
import ADDRESS from "@/app/constants/CONTRACT_ADDRESSES.json";

// Import components
import WalletConnect from "@/app/components/WalletConnect";
import SalaryDashboard from "@/app/components/SalaryDashboard";
import EmployeeManagement from "@/app/components/EmployeeManagement";
import AdminPanel from "@/app/components/AdminPanel";
import ContractInfo from "@/app/components/ContractInfo";

export default function Home() {
  const [contract, setContract] = useState(null);
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);

  useEffect(() => {
    // Initialize read-only contract on component mount
    initializeReadOnlyContract();
  }, []);

  useEffect(() => {
    if (connectedAccount) {
      initializeContract();
    } else {
      setContract(null);
      setIsOwner(false);
    }
  }, [connectedAccount]);

  const getNetworkAndAddress = async (provider = null) => {
    try {
      let networkProvider;
      let chainId;

      if (provider) {
        // Use connected provider
        const network = await provider.getNetwork();
        chainId = Number(network.chainId);
        networkProvider = provider;
      } else {
        // For read-only access, default to Sepolia with public RPC
        // Don't try to access MetaMask unless explicitly requested
        chainId = 11155111;
        networkProvider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
      }

      let contractAddress;
      let networkName;

      console.log("Detected Chain ID:", chainId);

      if (chainId === 11155111) {
        // Sepolia
        contractAddress = ADDRESS.sepolia.DefisalaryContract;
        networkName = "Sepolia Testnet";
      } else if (chainId === 1337 || chainId === 31337) {
        // Local network
        contractAddress = ADDRESS.localhost.DefisalaryContract;
        networkName = "Local Network";
      } else {
        throw new Error(
          `Unsupported network. Chain ID: ${chainId}. Please switch to Sepolia testnet or local network.`
        );
      }

      setCurrentNetwork({ chainId, name: networkName });
      return { contractAddress, provider: networkProvider, chainId };
    } catch (error) {
      console.error("Network detection error:", error);
      throw error;
    }
  };

  const initializeReadOnlyContract = async () => {
    try {
      setLoading(true);
      const { contractAddress, provider } = await getNetworkAndAddress();

      // Create read-only contract instance
      const readOnlyContractInstance = new ethers.Contract(
        contractAddress,
        ABI,
        provider
      );
      setReadOnlyContract(readOnlyContractInstance);
      console.log("Read-only contract initialized for", contractAddress);
    } catch (error) {
      console.error("Error initializing read-only contract:", error);
      // Don't show alert for read-only initialization failures
      console.log(
        "Failed to initialize read-only contract, some features may be limited"
      );
    } finally {
      setLoading(false);
    }
  };

  const initializeContract = async () => {
    if (!connectedAccount || typeof window.ethereum === "undefined") return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const { contractAddress } = await getNetworkAndAddress(provider);

      // Create contract instance with signer for write operations
      const contractInstance = new ethers.Contract(
        contractAddress,
        ABI,
        signer
      );
      setContract(contractInstance);

      // Check if connected account is the owner
      const owner = await contractInstance.owner();
      setIsOwner(owner.toLowerCase() === connectedAccount.toLowerCase());

      console.log("Contract initialized with signer for", contractAddress);
    } catch (error) {
      console.error("Error initializing contract:", error);
      alert("Failed to initialize contract: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (account) => {
    setConnectedAccount(account);
  };

  const handleDisconnect = () => {
    setConnectedAccount(null);
    setContract(null);
    setIsOwner(false);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "employees", label: "Employees", icon: "👥" },
    { id: "admin", label: "Admin", icon: "⚙️" },
    { id: "info", label: "Contract Info", icon: "ℹ️" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">DeFi Salary</h1>
              <span className="ml-2 text-sm text-gray-500">v2.0</span>
            </div>
            <div className="flex items-center space-x-4">
              {connectedAccount && (
                <div className="text-sm text-gray-600">
                  {isOwner && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold mr-2">
                      OWNER
                    </span>
                  )}
                  Connected:{" "}
                  {`${connectedAccount.slice(0, 6)}...${connectedAccount.slice(
                    -4
                  )}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Connection */}
        <WalletConnect
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          connectedAccount={connectedAccount}
          setConnectedAccount={setConnectedAccount}
        />

        {/* Network Info */}
        {currentNetwork && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-800">
                  Network Status
                </h3>
                <p className="text-blue-600">
                  Connected to: {currentNetwork.name} (Chain ID:{" "}
                  {currentNetwork.chainId})
                </p>
              </div>
              {!connectedAccount && readOnlyContract && (
                <div className="text-sm text-blue-600">
                  <span className="bg-blue-100 px-2 py-1 rounded-full">
                    Read-only mode
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white shadow-lg rounded-lg p-6 mb-6 text-center">
            <p className="text-gray-600">Initializing contract...</p>
          </div>
        )}

        {/* Contract Interface - Show when we have either connected contract or read-only contract */}
        {((connectedAccount && contract) ||
          (!connectedAccount && readOnlyContract)) &&
          !loading && (
            <>
              {/* Navigation Tabs */}
              <div className="bg-white shadow-lg rounded-lg mb-6">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6" aria-label="Tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                          activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === "dashboard" && (
                  <SalaryDashboard
                    contract={contract || readOnlyContract}
                    connectedAccount={connectedAccount}
                    isReadOnly={!connectedAccount}
                  />
                )}

                {activeTab === "employees" && (
                  <EmployeeManagement
                    contract={contract || readOnlyContract}
                    connectedAccount={connectedAccount}
                    isOwner={isOwner}
                    isReadOnly={!connectedAccount}
                  />
                )}

                {activeTab === "admin" && (
                  <AdminPanel
                    contract={contract || readOnlyContract}
                    connectedAccount={connectedAccount}
                    isOwner={isOwner}
                    isReadOnly={!connectedAccount}
                  />
                )}

                {activeTab === "info" && (
                  <ContractInfo
                    contract={contract || readOnlyContract}
                    connectedAccount={connectedAccount}
                    isReadOnly={!connectedAccount}
                  />
                )}
              </div>
            </>
          )}

        {/* Instructions for non-connected users */}
        {!connectedAccount && !readOnlyContract && !loading && (
          <div className="bg-white shadow-lg rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Welcome to DeFi Salary v2.0
            </h2>
            <p className="text-gray-600 mb-6">
              A decentralized salary management system that automatically
              converts USD salaries to ETH and pays employees using smart
              contracts and Chainlink price feeds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  💰 Automated Payments
                </h3>
                <p className="text-sm text-blue-600">
                  Set USD salaries and automatically pay in ETH
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  📊 Real-time Rates
                </h3>
                <p className="text-sm text-green-600">
                  Uses Chainlink price feeds for accurate conversion
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">
                  👥 Employee Management
                </h3>
                <p className="text-sm text-purple-600">
                  Add, remove, and manage employee details
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">
                  🔒 Secure & Transparent
                </h3>
                <p className="text-sm text-orange-600">
                  All transactions recorded on blockchain
                </p>
              </div>
            </div>
            <div className="mt-6 text-gray-500">
              <p>
                Please ensure you're connected to Sepolia testnet or local
                network, then connect your wallet.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>DeFi Salary v2.0 - Powered by Ethereum & Chainlink</p>
            <p className="mt-1">
              Make sure you're connected to Sepolia testnet or local network
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
