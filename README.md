# YAML Formatter

A simple tool to automatically fix and format YAML files for consistency and readability.

## Features

- Auto-corrects common YAML syntax issues
- Formats YAML files with proper indentation and structure
- Supports batch formatting of multiple files
- CLI and API usage

## Getting Started

### Prerequisites

- Node.js & npm ([Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
```

### Usage

#### Format a YAML file

```sh
npm run format <path-to-your-file.yml>
```

#### Format all YAML files in a directory

```sh
npm run format-all <directory-path>
```

## Technologies Used

- Node.js
- TypeScript
- YAML parser libraries

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

## License

This project is licensed under the MIT License.
