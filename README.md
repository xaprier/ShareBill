# ShareBill

A modern expense and debt tracking application for household expense management with shared responsibilities.

## Features

- **PWA Support** - Install as a mobile app
- **User Management** - Simple authentication system
- **Expense Tracking** - Create and manage expenses with shared responsibilities
- **Dashboard** - View your debts and payment history
- **Multi-language** - i18n support
- **Multi-theme** - Customizable themes
- **Mobile Responsive** - Optimized for all devices

## Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- PWA Support

### Backend

- Microservices Architecture
- Node.js
- Express
- SQLite

## Project Structure

```
sharebill/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # API Gateway
├── services/
│   ├── auth/         # Authentication service
│   ├── expense/      # Expense management service
│   └── user/         # User management service
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── database/     # Database schemas and migrations
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
# Run all services
pnpm dev

# Run only web app
pnpm dev:web

# Run only API gateway
pnpm dev:api

# Run all backend services
pnpm dev:services
```

### Build

```bash
pnpm build
```

## License

This project is licensed under the GNU GPLv3 License - see the [LICENSE](LICENSE) file for details.
