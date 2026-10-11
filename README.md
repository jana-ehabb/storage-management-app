# Storage Management App

A full-stack cloud file management application built with **Next.js, React, TypeScript, and Appwrite**. Manage your files in one place with authentication, file uploads, previews, downloads, and sharing.

## Features

- **User Authentication** — Sign up and sign in to your account.
- **File Uploads** — Upload files to cloud storage.
- **File Management** — Preview, download, rename, and delete files.
- **File Sharing** — Share files with other registered users.
- **Search & Filtering** — Find files by name and filter by file type.
- **Storage Dashboard** — View your files and storage usage.
- **Responsive Interface** — Use the application across desktop and mobile screen sizes.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack React framework |
| React | User interface |
| TypeScript | Type-safe development |
| Appwrite | Authentication, database, and cloud storage |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |

## Getting Started

### Prerequisites

- Node.js and npm
- An Appwrite project
- An Appwrite database and storage bucket configured for this application

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jana-ehabb/storage-management-app.git
   cd storage-management-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root and configure the environment variables required by `lib/appwrite/config.ts`.

   **Never commit your `.env.local` file or expose your Appwrite API key.**

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```text
storage-management-app/
├── app/                  # Application pages and layouts
├── components/           # Reusable UI components
├── constants/            # Application constants
├── hooks/                # Custom React hooks
├── lib/
│   ├── actions/           # File and user actions
│   └── appwrite/          # Appwrite configuration and clients
├── public/                # Static assets
├── types/                 # TypeScript definitions
├── .gitignore
├── package.json
└── README.md
```

## Security

- Environment variables are kept out of version control.
- File access depends on Appwrite storage and file permissions.
- Configure production permissions carefully to protect private user files.

## Future Improvements

- Deploy a public demo.
- Add automated tests.
- Improve file-sharing management and error handling.

## Author

**Jana Ehab**

- GitHub: [@jana-ehabb](https://github.com/jana-ehabb)

---

Built as a full-stack web development portfolio project.
