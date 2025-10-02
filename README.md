# Kido: The Retro Go Arena

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dkamioka/kido)

Kido is an online, real-time multiplayer Go game application with a stunning retro 90s-internet aesthetic. The application allows users to create new Go games or join existing ones from a public lobby. The core of the application is the interactive game board where two players take turns placing stones, capturing their opponent's pieces, and vying for territory.

The user interface is designed to be visually striking, evoking nostalgia with pixelated fonts, neon-glow effects, and CRT scanline overlays. All game state is managed on the server-side via a Cloudflare Durable Object, with the frontend polling for updates to ensure a near real-time experience.

## Key Features

-   **Online Multiplayer:** Play Go in real-time against other players.
-   **Retro 90s Aesthetic:** A unique, visually stunning UI with pixelated fonts, neon glows, and CRT effects.
-   **Game Lobby:** Browse and join existing games or create your own.
-   **Interactive Go Board:** A fully interactive 19x19 Goban.
-   **Server-Side Logic:** Game state and logic are authoritatively handled by a Cloudflare Durable Object.
-   **Built on Cloudflare:** Leverages the power of Cloudflare Workers for a fast, globally distributed backend.

## Technology Stack

-   **Frontend:**
    -   React
    -   Vite
    -   React Router
    -   Zustand for state management
    -   Tailwind CSS & shadcn/ui for styling
    -   Framer Motion for animations
-   **Backend:**
    -   Cloudflare Workers
    -   Hono web framework
    -   Cloudflare Durable Objects for state persistence
-   **Language:** TypeScript

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/) package manager
-   A [Cloudflare account](https://dash.cloudflare.com/sign-up)
-   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/kido_go_game.git
    cd kido_go_game
    ```

2.  **Install dependencies:**
    ```sh
    bun install
    ```

3.  **Run the development server:**
    The application will be available at `http://localhost:3000`.
    ```sh
    bun run dev
    ```

## Development

The project is structured into three main parts:

-   `src/`: Contains the frontend React application.
-   `worker/`: Contains the Cloudflare Worker backend code, including the Hono app and the Durable Object implementation.
-   `shared/`: Contains TypeScript types and interfaces shared between the frontend and backend.

### Frontend Development

All frontend components, pages, and hooks are located in the `src` directory. Changes will trigger a hot-reload in the development server.

### Backend Development

Backend routes are defined in `worker/userRoutes.ts` using Hono. The core stateful logic resides in the `GlobalDurableObject` class in `worker/durableObject.ts`. The local development server provided by Vite proxies API requests to a local instance of the worker, allowing for seamless full-stack development.

## Deployment

This application is designed for easy deployment to Cloudflare's global network.

1.  **Build the application:**
    This command bundles both the frontend and the worker for production.
    ```sh
    bun run build
    ```

2.  **Deploy to Cloudflare:**
    This command will publish your application to your Cloudflare account.
    ```sh
    bun run deploy
    ```

Alternatively, you can deploy directly from your GitHub repository using the button below.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dkamioka/kido)

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.