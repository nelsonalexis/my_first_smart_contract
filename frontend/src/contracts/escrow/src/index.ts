import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCSGPWWJNTTWA4CZU65IIQ3SWVELDWRFYCOKKZ6OF6ZMJXQEQNI5CMHQ",
  }
} as const


export interface Rental {
  arbitrator_1: string;
  arbitrator_2: string;
  arbitrator_3: string;
  claim_amount: i128;
  claim_evidence_hash: Buffer;
  deposit_amount: i128;
  final_evidence_hash: Buffer;
  initial_evidence_hash: Buffer;
  owner: string;
  owner_return_approved: boolean;
  owner_start_approved: boolean;
  rental_id: u64;
  renter: string;
  renter_return_approved: boolean;
  renter_start_approved: boolean;
  status: RentalStatus;
  token: string;
  undisputed_released: i128;
  vote_1: i128;
  vote_2: i128;
  vote_3: i128;
  voted_1: boolean;
  voted_2: boolean;
  voted_3: boolean;
}

export type RentalStatus = {tag: "Created", values: void} | {tag: "Accepted", values: void} | {tag: "Funded", values: void} | {tag: "Active", values: void} | {tag: "ReturnReported", values: void} | {tag: "VehicleReturned", values: void} | {tag: "Claim", values: void} | {tag: "Disputed", values: void} | {tag: "Resolved", values: void} | {tag: "Cancelled", values: void};

export interface Client {
  /**
   * Construct and simulate a vote transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  vote: ({rental_id, arbitrator, vote_amount}: {rental_id: u64, arbitrator: string, vote_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a cancel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a get_rental transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_rental: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a make_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  make_claim: ({rental_id, amount, evidence_hash}: {rental_id: u64, amount: i128, evidence_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a owner_start transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  owner_start: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a accept_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_claim: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a renter_start transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  renter_start: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a accept_rental transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_rental: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a create_rental transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_rental: ({rental_id, renter, owner, token, deposit_amount, initial_evidence_hash, arbitrator_1, arbitrator_2, arbitrator_3}: {rental_id: u64, renter: string, owner: string, token: string, deposit_amount: i128, initial_evidence_hash: Buffer, arbitrator_1: string, arbitrator_2: string, arbitrator_3: string}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a dispute_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  dispute_claim: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a report_return transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  report_return: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a contract_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  contract_address: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a release_no_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  release_no_claim: ({rental_id}: {rental_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a owner_confirm_return transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  owner_confirm_return: ({rental_id, final_evidence_hash}: {rental_id: u64, final_evidence_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

  /**
   * Construct and simulate a renter_confirm_return transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  renter_confirm_return: ({rental_id, final_evidence_hash}: {rental_id: u64, final_evidence_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Rental>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAABlJlbnRhbAAAAAAAGAAAAAAAAAAMYXJiaXRyYXRvcl8xAAAAEwAAAAAAAAAMYXJiaXRyYXRvcl8yAAAAEwAAAAAAAAAMYXJiaXRyYXRvcl8zAAAAEwAAAAAAAAAMY2xhaW1fYW1vdW50AAAACwAAAAAAAAATY2xhaW1fZXZpZGVuY2VfaGFzaAAAAAPuAAAAIAAAAAAAAAAOZGVwb3NpdF9hbW91bnQAAAAAAAsAAAAAAAAAE2ZpbmFsX2V2aWRlbmNlX2hhc2gAAAAD7gAAACAAAAAAAAAAFWluaXRpYWxfZXZpZGVuY2VfaGFzaAAAAAAAA+4AAAAgAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAFW93bmVyX3JldHVybl9hcHByb3ZlZAAAAAAAAAEAAAAAAAAAFG93bmVyX3N0YXJ0X2FwcHJvdmVkAAAAAQAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAAAAAAGcmVudGVyAAAAAAATAAAAAAAAABZyZW50ZXJfcmV0dXJuX2FwcHJvdmVkAAAAAAABAAAAAAAAABVyZW50ZXJfc3RhcnRfYXBwcm92ZWQAAAAAAAABAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAMUmVudGFsU3RhdHVzAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAAE3VuZGlzcHV0ZWRfcmVsZWFzZWQAAAAACwAAAAAAAAAGdm90ZV8xAAAAAAALAAAAAAAAAAZ2b3RlXzIAAAAAAAsAAAAAAAAABnZvdGVfMwAAAAAACwAAAAAAAAAHdm90ZWRfMQAAAAABAAAAAAAAAAd2b3RlZF8yAAAAAAEAAAAAAAAAB3ZvdGVkXzMAAAAAAQ==",
        "AAAAAgAAAAAAAAAAAAAADFJlbnRhbFN0YXR1cwAAAAoAAAAAAAAAAAAAAAdDcmVhdGVkAAAAAAAAAAAAAAAACEFjY2VwdGVkAAAAAAAAAAAAAAAGRnVuZGVkAAAAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAADlJldHVyblJlcG9ydGVkAAAAAAAAAAAAAAAAAA9WZWhpY2xlUmV0dXJuZWQAAAAAAAAAAAAAAAAFQ2xhaW0AAAAAAAAAAAAAAAAAAAhEaXNwdXRlZAAAAAAAAAAAAAAACFJlc29sdmVkAAAAAAAAAAAAAAAJQ2FuY2VsbGVkAAAA",
        "AAAAAAAAAAAAAAAEdm90ZQAAAAMAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAYAAAAAAAAACmFyYml0cmF0b3IAAAAAABMAAAAAAAAAC3ZvdGVfYW1vdW50AAAAAAsAAAABAAAH0AAAAAZSZW50YWwAAA==",
        "AAAAAAAAAAAAAAAGY2FuY2VsAAAAAAABAAAAAAAAAAlyZW50YWxfaWQAAAAAAAAGAAAAAQAAB9AAAAAGUmVudGFsAAA=",
        "AAAAAAAAAAAAAAAHZGVwb3NpdAAAAAABAAAAAAAAAAlyZW50YWxfaWQAAAAAAAAGAAAAAQAAB9AAAAAGUmVudGFsAAA=",
        "AAAAAAAAAAAAAAAKZ2V0X3JlbnRhbAAAAAAAAQAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAEAAAfQAAAABlJlbnRhbAAA",
        "AAAAAAAAAAAAAAAKbWFrZV9jbGFpbQAAAAAAAwAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAA1ldmlkZW5jZV9oYXNoAAAAAAAD7gAAACAAAAABAAAH0AAAAAZSZW50YWwAAA==",
        "AAAAAAAAAAAAAAALb3duZXJfc3RhcnQAAAAAAQAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAEAAAfQAAAABlJlbnRhbAAA",
        "AAAAAAAAAAAAAAAMYWNjZXB0X2NsYWltAAAAAQAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAEAAAfQAAAABlJlbnRhbAAA",
        "AAAAAAAAAAAAAAAMcmVudGVyX3N0YXJ0AAAAAQAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAEAAAfQAAAABlJlbnRhbAAA",
        "AAAAAAAAAAAAAAANYWNjZXB0X3JlbnRhbAAAAAAAAAEAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAYAAAABAAAH0AAAAAZSZW50YWwAAA==",
        "AAAAAAAAAAAAAAANY3JlYXRlX3JlbnRhbAAAAAAAAAkAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAYAAAAAAAAABnJlbnRlcgAAAAAAEwAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAADmRlcG9zaXRfYW1vdW50AAAAAAALAAAAAAAAABVpbml0aWFsX2V2aWRlbmNlX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAAMYXJiaXRyYXRvcl8xAAAAEwAAAAAAAAAMYXJiaXRyYXRvcl8yAAAAEwAAAAAAAAAMYXJiaXRyYXRvcl8zAAAAEwAAAAEAAAfQAAAABlJlbnRhbAAA",
        "AAAAAAAAAAAAAAANZGlzcHV0ZV9jbGFpbQAAAAAAAAEAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAYAAAABAAAH0AAAAAZSZW50YWwAAA==",
        "AAAAAAAAAAAAAAANcmVwb3J0X3JldHVybgAAAAAAAAEAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAYAAAABAAAH0AAAAAZSZW50YWwAAA==",
        "AAAAAAAAAAAAAAAQY29udHJhY3RfYWRkcmVzcwAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAQcmVsZWFzZV9ub19jbGFpbQAAAAEAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAYAAAABAAAH0AAAAAZSZW50YWwAAA==",
        "AAAAAAAAAAAAAAAUb3duZXJfY29uZmlybV9yZXR1cm4AAAACAAAAAAAAAAlyZW50YWxfaWQAAAAAAAAGAAAAAAAAABNmaW5hbF9ldmlkZW5jZV9oYXNoAAAAA+4AAAAgAAAAAQAAB9AAAAAGUmVudGFsAAA=",
        "AAAAAAAAAAAAAAAVcmVudGVyX2NvbmZpcm1fcmV0dXJuAAAAAAAAAgAAAAAAAAAJcmVudGFsX2lkAAAAAAAABgAAAAAAAAATZmluYWxfZXZpZGVuY2VfaGFzaAAAAAPuAAAAIAAAAAEAAAfQAAAABlJlbnRhbAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    vote: this.txFromJSON<Rental>,
        cancel: this.txFromJSON<Rental>,
        deposit: this.txFromJSON<Rental>,
        get_rental: this.txFromJSON<Rental>,
        make_claim: this.txFromJSON<Rental>,
        owner_start: this.txFromJSON<Rental>,
        accept_claim: this.txFromJSON<Rental>,
        renter_start: this.txFromJSON<Rental>,
        accept_rental: this.txFromJSON<Rental>,
        create_rental: this.txFromJSON<Rental>,
        dispute_claim: this.txFromJSON<Rental>,
        report_return: this.txFromJSON<Rental>,
        contract_address: this.txFromJSON<string>,
        release_no_claim: this.txFromJSON<Rental>,
        owner_confirm_return: this.txFromJSON<Rental>,
        renter_confirm_return: this.txFromJSON<Rental>
  }
}