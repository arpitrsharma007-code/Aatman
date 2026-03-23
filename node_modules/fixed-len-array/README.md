<div align="center">
  <img src="https://raw.githubusercontent.com/PtPrashantTripathi/fixed-len-array/main/logo/fixed_len_array.png" alt="📐 fixed-len-array" width="420"/>

  <h1>📐 fixed-len-array</h1>

  <p>
    <strong>A tiny and type-safe TypeScript utility to create and work with fixed-length arrays (tuples). Automatically trims or pads input arrays at runtime, while offering compile-time safety using TypeScript's type system.</strong>
  </p>

  <p>
    <a href="https://www.npmjs.com/package/fixed-len-array"><img src="https://img.shields.io/npm/v/fixed-len-array.svg" alt="NPM Version"/></a>
    <a href="https://github.com/PtPrashantTripathi/fixed-len-array/actions/workflows/npm-publish.yml"><img src="https://github.com/PtPrashantTripathi/fixed-len-array/actions/workflows/npm-publish.yml/badge.svg" alt="Build Status"/></a>
    <a href="https://github.com/ptprashanttripathi/fixed-len-array/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/fixed-len-array.svg" alt="MIT License"/></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg" alt="TypeScript Ready"/></a>
    <a href="https://github.com/ptprashanttripathi/fixed-len-array/blob/main/docs"><img src="https://img.shields.io/badge/docs-available-brightgreen.svg" alt="Documentation"/></a>
  </p>
</div>

## ✨ Features

- ✅ Enforces fixed-length array types (tuples)
- 🧠 Type-safe construction
- 🔧 Automatically trims or pads at runtime
- 🔄 Pads with a **custom value** or falls back to `null` if not provided
- 📦 Tiny, no dependencies
- 🔁 Works in both Node.js and browser environments (ESM only)

## 🚀 Usage

```sh
npm install fixed-len-array
```

```ts
import { toFixedLengthArray, FixedLengthArray } from "fixed-len-array";

// Pads to a fixed length of 3 with custom default
const vec3 = toFixedLengthArray([1], 3, 0);
// Result: [1, 0, 0]

// If no default is provided, pads with `null`
const paddedWithNull = toFixedLengthArray([1], 3);
// Result: [1, null, null]

// Trims if input is longer
const trimmed = toFixedLengthArray([1, 2, 3, 4, 5], 3, 0);
// Result: [1, 2, 3]

// Full type support
type Vec3 = FixedLengthArray<3, number>;
```

## 🧪 API

### `toFixedLengthArray<T, N>(input: T[], fixedLength: N, defaultValue?: T): FixedLengthArray<N, T>`

Creates a fixed-length array by trimming or padding the input. If `defaultValue`
is omitted, `null` will be used for padding.

### `type FixedLengthArray<N, T>`

A recursive type that represents a tuple of length `N`, with all elements of
type `T`.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md)
for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/ptprashanttripathi/fixed-len-array.git
cd fixed-len-array

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

## 📄 License

This project is [MIT](LICENSE) licensed.

---

<div align="center">
<p>Made with ❤️ by <a href="https://github.com/ptprashanttripathi">Pt. Prashant Tripathi</a></p>
<p>⭐ Star this repo if you find it helpful!</p>
</div>
