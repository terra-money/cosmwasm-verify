# CosmWasm Verify

>This repo is forked from https://github.com/CosmWasm/cosmwasm-verify.

A tool to verify a CosmWasm build result against its github commit. 

**It only supports github based code verification**

When uploading a smart contract to a blockchain, storage is very expensive.
For this reason we only want to store the absolute minimum of data required for execution
on chain. However, a Wasm bytecode does not allow for reviewing the functionality that
is executed in a smart contract.
For auditing we need to look into the original source, which we can
link on chain. In order to verify that the build result indeed matches the linked source code,
we use CosmWasm Verify.

## From source to Wasm bytecode

A source code is compiled into Wasm bytecode using a "builder", i.e. a compiler toolchain
that typically optimizes the code for small size or low execution cost. Builders are identified
by docker images in CosmWasm, which is a convenient way to represent a whole suite of tools and
scripts in a short identifier.

The same source code can be compiled using different builders, e.g. when the tooling improves over
time or to do custom optimization priorities (some user prefers smaller code, another user prefers cheaper execution).

## How to use

```sh
# add cosmwasm-verify bash script to PATH
export PATH="$PWD/bin:$PATH"

# setup .env
cp ./.env_example ./.env

# modify the environment variables
# LCD_URL="https://bombay-lcd.terra.dev"
# LISTEN_PORT="8080"
nano ./.env

npm i
npm start
```

## Endpoint

* `[POST] /verify`

  Request Body
  ```ts
  {
    github_org: string,
    github_repo: string,
    github_commit: string,
    contract_name: string,
    builder_image: string,
    code_id: string,
  }
  ```

  Response
  ```ts
  {
    verified: boolean,
    message: string,
  }
  ```

  Bombay Code Verification Example
  ```sh
  curl -X POST -H "Content-Type: application/json" -d '{
   "github_org":"YunSuk-Yeo",
   "github_repo":"luna-vesting",
   "github_commit":"0d717f91fed4fba9f91c70524d4948388585542e",
   "contract_name":"vesting",
   "builder_image":"cosmwasm/workspace-optimizer:0.12.3",
   "code_id":"33810"
  }' http://127.0.0.1:8080/verify
  ```

## The inputs and outputs

CosmWasm Verify has 6 input parameters:

- **Github Org** is an github organization name
- **Github Repo** is an github repository name
- **Github Commit** is an github commit hash
- **Contract Name** is the name of contract within the given repository.
- **Builder** is a docker image, including version.
- **Code ID** is the code id of a contract on chain

The script `cosmwasm-verify` takes those 6 inputs as positional arguments.

## Language support

CosmWasm Verify is CosmWasm specific but generic enough to support multiple languages.
The primary smart contract language at the moment is Rust and the primary Rust builder is
[cosmwasm-opt](https://github.com/confio/cosmwasm-opt).
The [upcoming AssemblyScript support](https://github.com/confio/cosmwasm/pull/118) will require a
different builder but should be handles equally by CosmWasm Verify.

## Conventions

In order to make our lifes easier, we need a trade-off between flexibility and
pre-defined rules. Here are a set of conventions required for CosmWasm Verify
to work.

### The builder

1. The builder is a docker image that works out of the box with `docker run <builder>`.
1. The builder docker image contains at least two name components (organization and name) and does not exceed a length of 128 ASCII chars.<sup>[1]</sup>
1. The builder takes a volume mounted at `/code` which is the root of the code to be built.
1. The builder must create an `artifacts/` directory in the current directory with a `<contract_name>.wasm` for each compiled contract.

### Others

1. The source URL points to an optionally compressed tar archive that includes a single top directory which.
1. All checksums are lower hex encoded SHA-256 hashes

<sup>[1]</sup> This is enforced by the blockchain, not CosmWasm Verify.

## Requirements

CosmWasm Verify aims to run in every UNIX-like environment. It requires the
following tools to work:

- `bash`
- `wget`
- `docker`
- `sha256sum` or `shasum`
