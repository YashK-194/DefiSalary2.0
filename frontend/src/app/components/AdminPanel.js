"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const AdminPanel = ({
  contract,
  connectedAccount,
  isOwner,
  isReadOnly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [contractBalance, setContractBalance] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [fundAmount, setFundAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [convertedEthWei, setConvertedEthWei] = useState(null);

  useEffect(() => {
    if (contract && isOwner) {
      fetchAdminData();
    }
  }, [contract, isOwner]);

  const fetchAdminData = async () => {
    if (!contract) return;

    try {
      setLoading(true);

      // Fetch contract balance
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));

      // Fetch ETH price
      const ethPriceWei = await contract.getLatestETHPrice();
      setEthPrice(ethers.formatUnits(ethPriceWei, 18));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const transferOwnership = async (e) => {
    e.preventDefault();
    if (!contract || !isOwner || !newOwnerAddress) return;

    if (!ethers.isAddress(newOwnerAddress)) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to transfer ownership to ${newOwnerAddress}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.transferOwnership(newOwnerAddress);
      await tx.wait();
      alert("Ownership transferred successfully!");
      setNewOwnerAddress("");
    } catch (error) {
      console.error("Error transferring ownership:", error);
      alert("Failed to transfer ownership: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fundContract = async (e) => {
    e.preventDefault();
    if (!contract || !fundAmount) return;

    try {
      setLoading(true);

      // Send ETH to contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: await contract.getAddress(),
        value: ethers.parseEther(fundAmount),
      });

      await tx.wait();
      alert(`Contract funded with ${fundAmount} ETH successfully!`);
      setFundAmount("");
      fetchAdminData();
    } catch (error) {
      console.error("Error funding contract:", error);
      alert("Failed to fund contract: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const withdrawFunds = async () => {
    if (!contract || !isOwner) return;

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect?.(signer) || contract;

      const tx = await contractWithSigner.withdrawFunds();
      await tx.wait();
      alert("Funds withdrawn to owner successfully!");
      fetchAdminData();
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      alert("Withdraw failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const performUpkeep = async () => {
    if (!contract || !isOwner) return;

    try {
      setLoading(true);

      // Check if upkeep is needed
      const [upkeepNeeded, performData] = await contract.checkUpkeep("0x");

      if (!upkeepNeeded) {
        alert("No upkeep needed at this time");
        return;
      }

      const tx = await contract.performUpkeep(performData);
      await tx.wait();
      alert("Upkeep performed successfully! Salaries have been paid.");
      fetchAdminData();
    } catch (error) {
      console.error("Error performing upkeep:", error);
      alert("Failed to perform upkeep: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUpkeepStatus = async () => {
    if (!contract) return;

    try {
      const [upkeepNeeded] = await contract.checkUpkeep("0x");
      alert(
        upkeepNeeded
          ? "Upkeep is needed - salaries are due!"
          : "No upkeep needed at this time"
      );
    } catch (error) {
      console.error("Error checking upkeep:", error);
      alert("Failed to check upkeep status: " + error.message);
    }
  };

  if (!isOwner && !isReadOnly) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Admin Panel</h2>
        <p className="text-gray-600">
          Only the contract owner can access admin functions.
        </p>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Admin Panel</h2>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            📖 <strong>Read-only mode:</strong> Connect your wallet as the
            contract owner to access admin functions.
          </p>
        </div>

        {/* Contract Stats - Read Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg opacity-75">
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              Contract Balance
            </h3>
            <p className="text-2xl font-bold text-blue-900">
              {contractBalance
                ? `${parseFloat(contractBalance).toFixed(4)} ETH`
                : "Loading..."}
            </p>
            {contractBalance && ethPrice && (
              <p className="text-sm text-blue-600">
                ≈ $
                {(parseFloat(contractBalance) * parseFloat(ethPrice)).toFixed(
                  2
                )}{" "}
                USD
              </p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg opacity-75">
            <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
              Current ETH Price
            </h3>
            <p className="text-2xl font-bold text-green-900">
              ${ethPrice ? parseFloat(ethPrice).toFixed(2) : "Loading..."}
            </p>
          </div>
        </div>

        {/* Status Check - Available in read-only */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Salary Payment Status
          </h3>
          <button
            onClick={checkUpkeepStatus}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Check Payment Status
          </button>
          <p className="text-sm text-gray-600 mt-2">
            * Check if employees are due for salary payments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin Panel</h2>
        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Contract Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
            Contract Balance
          </h3>
          <p className="text-2xl font-bold text-blue-900">
            {contractBalance
              ? `${parseFloat(contractBalance).toFixed(4)} ETH`
              : "Loading..."}
          </p>
          {contractBalance && ethPrice && (
            <p className="text-sm text-blue-600">
              ≈ $
              {(parseFloat(contractBalance) * parseFloat(ethPrice)).toFixed(2)}{" "}
              USD
            </p>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
            Current ETH Price
          </h3>
          <p className="text-2xl font-bold text-green-900">
            ${ethPrice ? parseFloat(ethPrice).toFixed(2) : "Loading..."}
          </p>
        </div>
      </div>

      {/* Fund Contract */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Fund Contract
        </h3>
        <form
          onSubmit={fundContract}
          className="flex flex-col sm:flex-row gap-4"
        >
          <input
            type="number"
            step="0.001"
            placeholder="Amount in ETH"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
          />
          <button
            type="submit"
            disabled={loading || !fundAmount}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? "Funding..." : "Fund Contract"}
          </button>
        </form>
      </div>

      {/* Withdraw Funds */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Withdraw Funds
        </h3>
        <div className="mt-4">
          <button
            onClick={withdrawFunds}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? "Processing..." : "Withdraw Funds"}
          </button>
        </div>
      </div>

      {/* USD -> ETH Converter */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          USD → ETH Converter
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Enter a USD amount and convert it to ETH using the contract's price
          feed.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!contract || !usdAmount) return;
            try {
              setLoading(true);
              // contract.usdToEth expects USD amount (matching contract units)
              const ethWei = await contract.usdToEth(usdAmount);
              // store raw wei; format when rendering to avoid accidental double-formatting
              setConvertedEthWei(ethWei.toString());
            } catch (error) {
              console.error("Error converting USD to ETH:", error);
              alert("Conversion failed: " + error.message);
            } finally {
              setLoading(false);
            }
          }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <input
            type="number"
            step="0.01"
            placeholder="Amount in USD"
            value={usdAmount}
            onChange={(e) => setUsdAmount(e.target.value)}
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            type="submit"
            disabled={loading || !usdAmount}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? "Converting..." : "Convert"}
          </button>
        </form>

        {convertedEthWei !== null && (
          <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Equivalent ETH</p>
            <p className="text-xl font-bold text-gray-800">
              {ethers.formatEther(convertedEthWei)} ETH
            </p>
            <p className="text-sm text-gray-500">(~ ${usdAmount} USD)</p>
          </div>
        )}
      </div>

      {/* Upkeep Controls */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Salary Payment Control
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={checkUpkeepStatus}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Check Payment Status
          </button>
          <button
            onClick={performUpkeep}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? "Processing..." : "Pay Salaries"}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          * Check if employees are due for salary payments, and trigger manual
          payments if needed.
        </p>
      </div>

      {/* Transfer Ownership */}
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-red-800">
          Transfer Ownership
        </h3>
        <p className="text-sm text-red-600 mb-4">
          ⚠️ Warning: Transferring ownership will permanently give control of
          this contract to another address.
        </p>
        <form
          onSubmit={transferOwnership}
          className="flex flex-col sm:flex-row gap-4"
        >
          <input
            type="text"
            placeholder="New Owner Address (0x...)"
            value={newOwnerAddress}
            onChange={(e) => setNewOwnerAddress(e.target.value)}
            required
            className="flex-1 border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
          />
          <button
            type="submit"
            disabled={loading || !newOwnerAddress}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? "Transferring..." : "Transfer Ownership"}
          </button>
        </form>
      </div>

      {/* Current Owner Info */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Current Owner:</strong> {connectedAccount}
        </p>
        <p>
          <strong>Contract Address:</strong>{" "}
          {contract ? contract.target || contract.address : "Loading..."}
        </p>
      </div>
    </div>
  );
};

export default AdminPanel;
