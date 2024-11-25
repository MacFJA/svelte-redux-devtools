# Redux Devtools connector for Svelte

Allow to track and rewind stores value with Redux Devtools.

![GitHub Repo stars](https://img.shields.io/github/stars/macfja/svelte-redux-devtools?style=social)
![Download per week](https://img.shields.io/npm/dw/@macfja/svelte-redux-devtools)
![License](https://img.shields.io/npm/l/@macfja/svelte-redux-devtools)
![NPM version](https://img.shields.io/npm/v/@macfja/svelte-redux-devtools)
[![JavaScript Style Guide: Biomejs](https://img.shields.io/badge/code%20style-biomejs-brightgreen.svg?style=flat)](https://biomejs.dev/ "One toolchain for your web project")

## Installation

### NPM

```sh
npm install @macfja/svelte-redux-devtools
```
## Usage

```sveltehtml
<script lang="ts">
import { writable } from "svelte/store"
import { trackStores } from "@macfja/svelte-redux-devtools";
let name = writable("John");
let age = writable(33)

trackStores({ name, age }, { prefix: 'app', hasOneState: true })

</script>

<h1>Hello {$name}!</h1>

<input bind:value={$name} />
<input bind:value={$age} type="range" min={0} max={120} />

```

## Contributing

Contributions are welcome. Please open up an issue or create PR if you would like to help out.

Read more in the [Contributing file](CONTRIBUTING.md)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
