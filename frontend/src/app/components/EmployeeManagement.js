"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const EmployeeManagement = ({
  contract,
  connectedAccount,
  isOwner,
  isReadOnly = false,
}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    walletAddress: "",
    salaryUSD: "",
  });
  const [updateEmployee, setUpdateEmployee] = useState({
    id: "",
    name: "",
    walletAddress: "",
    salaryUSD: "",
    isActive: true,
  });
  useEffect(() => {
    if (contract) {
      fetchEmployees();
    }
  }, [contract]);

  const fetchEmployees = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const employeeCount = await contract.getEmployeesCount();
      const employeeList = [];

      for (let i = 0; i < employeeCount; i++) {
        try {
          const employee = await contract.employees(i);
          if (employee.walletAdd !== ethers.ZeroAddress) {
            employeeList.push({
              id: i,
              name: employee.name,
              walletAddress: employee.walletAdd,
              isActive: employee.isActive,
              salaryUSD: employee.salaryUSD.toString(),
              joiningDate: new Date(
                Number(employee.joiningDate) * 1000
              ).toLocaleDateString(),
              lastPaymentDate:
                Number(employee.lastPaymentDate) > 0
                  ? new Date(
                      Number(employee.lastPaymentDate) * 1000
                    ).toLocaleDateString()
                  : "Never",
            });
          }
        } catch (error) {
          console.log(`Employee ${i} not found or error:`, error);
        }
      }

      setEmployees(employeeList);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (e) => {
    e.preventDefault();
    if (!contract || !isOwner) return;

    try {
      setLoading(true);
      const tx = await contract.addEmployee(
        newEmployee.name,
        newEmployee.walletAddress,
        ethers.parseUnits(newEmployee.salaryUSD, 18)
      );

      await tx.wait();
      alert("Employee added successfully!");
      setNewEmployee({ name: "", walletAddress: "", salaryUSD: "" });
      setShowAddForm(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeDetails = async (e) => {
    e.preventDefault();
    if (!contract || !isOwner) return;

    try {
      setLoading(true);
      const salaryInWei = ethers.parseEther(updateEmployee.salaryUSD);

      const tx = await contract.updateEmployeeDetails(
        updateEmployee.name,
        updateEmployee.walletAddress,
        updateEmployee.isActive,
        salaryInWei,
        updateEmployee.id
      );

      await tx.wait();
      alert("Employee updated successfully!");
      setUpdateEmployee({
        id: "",
        name: "",
        walletAddress: "",
        salaryUSD: "",
        isActive: true,
      });
      setShowUpdateForm(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openUpdateForm = (employee) => {
    setUpdateEmployee({
      id: employee.id,
      name: employee.name,
      walletAddress: employee.walletAddress,
      salaryUSD: ethers.formatEther(employee.salaryUSD),
      isActive: employee.isActive,
    });
    setShowUpdateForm(true);
  };

  const toggleEmployeeStatus = async (employeeId, currentStatus) => {
    if (!contract || !isOwner) return;

    try {
      setLoading(true);
      const employee = employees.find((emp) => emp.id === employeeId);
      const tx = await contract.updateEmployeeDetails(
        employeeId,
        employee.name,
        !currentStatus,
        employee.walletAddress,
        ethers.parseUnits(employee.salaryUSD, 18)
      );
      await tx.wait();
      alert(
        `Employee ${currentStatus ? "deactivated" : "activated"} successfully!`
      );
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee status:", error);
      alert("Failed to update employee status: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner && !isReadOnly) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Employee Management
        </h2>
        <p className="text-gray-600">
          Only the contract owner can manage employees.
        </p>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Employee Management
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            📖 <strong>Read-only mode:</strong> Connect your wallet to manage
            employees. You can view employee data below.
          </p>
        </div>

        <div className="space-y-4">
          {loading && employees.length === 0 ? (
            <p className="text-center text-gray-600">Loading employees...</p>
          ) : employees.length === 0 ? (
            <p className="text-center text-gray-600">No employees found.</p>
          ) : (
            employees.map((employee) => (
              <div
                key={employee.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Name:</p>
                    <p className="text-base font-semibold text-gray-800">
                      {employee.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Wallet:</p>
                    <p className="font-mono text-base text-gray-800">
                      {employee.walletAddress.slice(0, 10)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Salary (USD):</p>
                    <p className="text-base font-semibold text-gray-800">
                      $
                      {Number(
                        ethers.formatUnits(employee.salaryUSD, 18)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Status:</p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        employee.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {employee.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm text-gray-700">Joining Date:</p>
                    <p className="text-sm text-gray-800">
                      {employee.joiningDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Last Payment:</p>
                    <p className="text-sm text-gray-800">
                      {employee.lastPaymentDate}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {employees.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={fetchEmployees}
              disabled={loading}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "Refreshing..." : "Refresh List"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Employee Management
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Employee"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addEmployee} className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            Add New Employee
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Employee Name"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
              required
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Wallet Address"
              value={newEmployee.walletAddress}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  walletAddress: e.target.value,
                })
              }
              required
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Salary (USD)"
              value={newEmployee.salaryUSD}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, salaryUSD: e.target.value })
              }
              required
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {loading ? "Adding..." : "Add Employee"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {loading && employees.length === 0 ? (
          <p className="text-center text-gray-600">Loading employees...</p>
        ) : employees.length === 0 ? (
          <p className="text-center text-gray-600">No employees found.</p>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-700">Name:</p>
                      <p className="text-base font-semibold text-gray-800">
                        {employee.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Wallet:</p>
                      <p className="font-mono text-base text-gray-800">
                        {employee.walletAddress.slice(0, 10)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Salary (USD):</p>
                      <p className="text-base font-semibold text-gray-800">
                        $
                        {Number(
                          ethers.formatUnits(employee.salaryUSD, 18)
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Status:</p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          employee.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-gray-700">Joining Date:</p>
                      <p className="text-sm text-gray-800">
                        {employee.joiningDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Last Payment:</p>
                      <p className="text-sm text-gray-800">
                        {employee.lastPaymentDate}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => openUpdateForm(employee)}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={() =>
                      toggleEmployeeStatus(employee.id, employee.isActive)
                    }
                    disabled={loading}
                    className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                      employee.isActive
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {employee.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {employees.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh List"}
          </button>
        </div>
      )}

      {/* Update Employee Modal */}
      {showUpdateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Update Employee Details
              </h3>
              <button
                onClick={() => setShowUpdateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={updateEmployeeDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={updateEmployee.name}
                  onChange={(e) =>
                    setUpdateEmployee({
                      ...updateEmployee,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={updateEmployee.walletAddress}
                  onChange={(e) =>
                    setUpdateEmployee({
                      ...updateEmployee,
                      walletAddress: e.target.value,
                    })
                  }
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0x..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Salary (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updateEmployee.salaryUSD}
                  onChange={(e) =>
                    setUpdateEmployee({
                      ...updateEmployee,
                      salaryUSD: e.target.value,
                    })
                  }
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={updateEmployee.isActive}
                  onChange={(e) =>
                    setUpdateEmployee({
                      ...updateEmployee,
                      isActive: e.target.value === "true",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  {loading ? "Updating..." : "Update Employee"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdateForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
