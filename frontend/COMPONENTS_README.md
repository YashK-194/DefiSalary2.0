# DeFi Salary Frontend v2.0

A React-based frontend application for interacting with the DeFi Salary smart contract. This application allows companies to manage employees and automate salary payments in ETH based on USD-denominated salaries using Chainlink price feeds.

## Components Overview

### 1. WalletConnect Component (`/components/WalletConnect.js`)

- **Purpose**: Handles MetaMask wallet connection and disconnection
- **Features**:
  - Connect/disconnect wallet functionality
  - Display connected account address
  - Show ETH balance
  - Responsive design with connection status indicators

### 2. SalaryDashboard Component (`/components/SalaryDashboard.js`)

- **Purpose**: Main dashboard displaying salary information and statistics
- **Features**:
  - Real-time ETH price display
  - Contract balance information
  - Employee salary overview (USD and ETH equivalent)
  - Monthly salary totals
  - Employee list with payment history

### 3. EmployeeManagement Component (`/components/EmployeeManagement.js`)

- **Purpose**: Manage employee records (Owner only)
- **Features**:
  - Add new employees with name, wallet address, and USD salary
  - Remove employees from the system
  - Activate/deactivate employee status
  - View employee details and payment history
  - Form validation and error handling

### 4. AdminPanel Component (`/components/AdminPanel.js`)

- **Purpose**: Administrative functions for contract owner
- **Features**:
  - Fund contract with ETH
  - Transfer contract ownership
  - Manual salary payment triggers
  - Check upkeep status
  - Contract balance monitoring

### 5. ContractInfo Component (`/components/ContractInfo.js`)

- **Purpose**: Display contract information and blockchain details
- **Features**:
  - Contract address and owner information
  - Network information (Chain ID, network name)
  - Quick actions (copy addresses, view on Etherscan)
  - Contract statistics
  - Add contract to wallet functionality

## File Structure

```
src/app/
├── page.js                 # Main application page with routing and contract initialization
├── components/
│   ├── WalletConnect.js    # Wallet connection component
│   ├── SalaryDashboard.js  # Main dashboard component
│   ├── EmployeeManagement.js # Employee CRUD operations
│   ├── AdminPanel.js       # Admin functions
│   └── ContractInfo.js     # Contract information display
├── constants/
│   ├── CONTRACT_ABI.json   # Smart contract ABI
│   └── CONTRACT_ADDRESSES.json # Contract addresses per network
└── utils/
    └── helpers.js          # Utility functions and helpers
```

## Key Features

### 🔐 Wallet Integration

- MetaMask wallet connection
- Network detection and validation
- Account balance display
- Transaction handling

### 📊 Real-time Data

- Live ETH price from Chainlink oracles
- Contract balance monitoring
- Employee payment tracking
- Network status information

### 👥 Employee Management

- Add/remove employees
- Set USD-denominated salaries
- Employee status management
- Payment history tracking

### ⚙️ Admin Controls

- Contract funding
- Ownership transfer
- Manual payment triggers
- Upkeep management

### 🎨 User Interface

- Responsive design with Tailwind CSS
- Tab-based navigation
- Loading states and error handling
- Accessible form controls

## Network Support

The application supports the following networks:

- **Sepolia Testnet** (Chain ID: 11155111)
- **Localhost/Hardhat** (Chain ID: 1337/31337)

## Usage

### For Employees:

1. Connect your MetaMask wallet
2. View the dashboard to see your salary information
3. Check payment history and status

### For Employers (Contract Owner):

1. Connect your MetaMask wallet (must be contract owner)
2. Use the **Employees** tab to manage your workforce
3. Use the **Admin** tab to fund the contract and manage payments
4. Monitor contract status in the **Contract Info** tab

## Installation

1. Install dependencies:

```bash
npm install ethers
```

2. Ensure your MetaMask wallet is connected to the supported network

3. Make sure the contract is deployed and the addresses are correctly configured in `CONTRACT_ADDRESSES.json`

## Smart Contract Functions Used

- `addEmployee()` - Add new employee
- `removeEmployee()` - Remove employee
- `updateEmployeeDetails()` - Update employee information
- `getEmployeesCount()` - Get total employee count
- `employees()` - Get employee details
- `getContractBalance()` - Get contract ETH balance
- `getLatestETHPrice()` - Get current ETH/USD price
- `owner()` - Get contract owner
- `checkUpkeep()` - Check if salary payments are due
- `performUpkeep()` - Execute salary payments
- `transferOwnership()` - Transfer contract ownership

## Security Features

- Owner-only functions are properly restricted
- Input validation on all forms
- Transaction error handling
- Network validation
- Address format validation

## Styling

The application uses Tailwind CSS for styling with a clean, modern design:

- Card-based layout
- Responsive grid system
- Color-coded status indicators
- Hover effects and transitions
- Accessible form controls

This frontend provides a complete interface for interacting with the DeFi Salary smart contract, offering both employee and administrative functionality in a user-friendly web application.
