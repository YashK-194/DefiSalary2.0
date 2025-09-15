"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const SalaryDashboard = ({
  contract,
  connectedAccount,
  isReadOnly = false,
}) => {
  const [employees, setEmployees] = useState([]);
  const [ethPrice, setEthPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractBalance, setContractBalance] = useState(null);

  useEffect(() => {
    if (contract) {
      fetchDashboardData();
    }
  }, [contract]);

  const fetchDashboardData = async () => {
    if (!contract) return;

    try {
      setLoading(true);

      // Fetch ETH price
      const ethPriceWei = await contract.getLatestETHPrice();
      setEthPrice(ethers.formatUnits(ethPriceWei, 18)); // Smart contract returns price with 18 decimals

      // Fetch contract balance
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(balance));

      // Fetch employees
      const employeeCount = await contract.getEmployeesCount();
      console.log("Employee count from contract:", employeeCount.toString());
      const employeeList = [];

      if (employeeCount === 0n || employeeCount === 0) {
        console.log("No employees in contract (count is 0)");
      } else {
        // Use 0-based indexing since employees start from index 0
        for (let i = 0; i < employeeCount; i++) {
          try {
            console.log(`Attempting to fetch employee ${i}...`);
            const employee = await contract.employees(i);
            console.log(`Employee ${i} raw data:`, employee);

            if (employee.walletAdd !== ethers.ZeroAddress) {
              // Calculate ETH equivalent of USD salary
              const salaryUSD = ethers.formatEther(employee.salaryUSD);
              const salaryETH =
                parseFloat(salaryUSD) /
                parseFloat(ethers.formatUnits(ethPriceWei, 18));

              employeeList.push({
                id: i,
                name: employee.name,
                walletAddress: employee.walletAdd,
                isActive: employee.isActive,
                salaryUSD: salaryUSD,
                salaryETH: salaryETH.toFixed(6),
                joiningDate: new Date(
                  Number(employee.joiningDate) * 1000
                ).toLocaleDateString(),
                lastPaymentDate:
                  Number(employee.lastPaymentDate) > 0
                    ? new Date(
                        Number(employee.lastPaymentDate) * 1000
                      ).toLocaleDateString()
                    : "Never",
                isCurrentUser:
                  employee.walletAdd.toLowerCase() ===
                  connectedAccount?.toLowerCase(),
              });
              console.log(`Employee ${i} added to list`);
            } else {
              console.log(`Employee ${i} has zero address, skipping`);
            }
          } catch (error) {
            console.log(`Error fetching employee ${i}:`, error);
          }
        }
      }

      console.log("Final employee list:", employeeList);
      console.log(
        "Setting employees state with",
        employeeList.length,
        "employees"
      );
      setEmployees(employeeList);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTotalMonthlySalary = () => {
    return employees
      .filter((emp) => emp.isActive)
      .reduce((total, emp) => total + parseFloat(emp.salaryUSD), 0);
  };

  const getTotalMonthlyETH = () => {
    return employees
      .filter((emp) => emp.isActive)
      .reduce((total, emp) => total + parseFloat(emp.salaryETH), 0);
  };

  if (loading && employees.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Salary Dashboard
        </h2>
        <p className="text-center text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Salary Dashboard</h2>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
            ETH Price
          </h3>
          <p className="text-2xl font-bold text-blue-900">
            ${ethPrice ? parseFloat(ethPrice).toFixed(2) : "Loading..."}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
            Contract Balance
          </h3>
          <p className="text-2xl font-bold text-green-900">
            {contractBalance
              ? `${parseFloat(contractBalance).toFixed(4)} ETH`
              : "Loading..."}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide">
            Monthly Salary (USD)
          </h3>
          <p className="text-2xl font-bold text-purple-900">
            ${getTotalMonthlySalary().toFixed(2)}
          </p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">
            Monthly Salary (ETH)
          </h3>
          <p className="text-2xl font-bold text-orange-900">
            {getTotalMonthlyETH().toFixed(6)} ETH
          </p>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Employee Salary Information
        </h3>

        {employees.length === 0 ? (
          <p className="text-center text-gray-600 py-8">No employees found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Salary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className={`${
                      employee.isCurrentUser ? "bg-blue-50" : ""
                    } hover:bg-gray-50`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {employee.name}
                            {employee.isCurrentUser && (
                              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {employee.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {formatAddress(employee.walletAddress)}
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-semibold">
                          ${parseFloat(employee.salaryUSD).toFixed(2)} USD
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.salaryETH} ETH
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.lastPaymentDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics */}
      {employees.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Employees:</span>
              <span className="ml-2 font-semibold text-gray-600">
                {employees.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Active Employees:</span>
              <span className="ml-2 font-semibold text-gray-600">
                {employees.filter((emp) => emp.isActive).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Inactive Employees:</span>
              <span className="ml-2 font-semibold text-gray-600">
                {employees.filter((emp) => !emp.isActive).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryDashboard;
