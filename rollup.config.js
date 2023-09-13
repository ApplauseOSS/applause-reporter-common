import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json' assert { type: 'json' };;

/** @type {import('rollup').RollupOptions} */
const options = [
	{
		input: 'src/index.ts',
		output: [{
			format: 'esm',
			file: pkg.module,
			sourcemap: true,
		}, {
			format: 'cjs',
			file: pkg.main,
			sourcemap: true,
		}, {
			name: pkg['umd:name'] || pkg.name,
			format: 'umd',
			file: pkg.unpkg,
			sourcemap: true,
			plugins: [
				terser()
			]
		}],
		external: [
			...require('module').builtinModules,
			...Object.keys(pkg.dependencies || {}),
		],
		plugins: [
			resolve(),
			typescript()
		]
	}
]
export default options;