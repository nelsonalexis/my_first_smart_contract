import { Buffer } from "buffer";
import { signTransaction } from "@stellar/freighter-api";

import {
  Client,
  networks,
} from "./contracts/escrow/dist/index.js";

import type {
  Rental,
} from "./contracts/escrow/dist/index.js";

export const CONTRACT_ID =
  networks.testnet.contractId;

export const NETWORK_PASSPHRASE =
  networks.testnet.networkPassphrase;

export const RPC_URL =
  "https://soroban-testnet.stellar.org";

export const XLM_TOKEN =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const ARBITRATORS = [
  "GBFJ3246XPRYXDOJPCBI62TCMW7FQD454OAX5ZSXVPTI5NZGNAV47NDO",
  "GBOPP7SRFTJTEXBOPYSPZISNST2B6CCR5X2U6YTCMDHNPKYADEHXNUZQ",
  "GAFRWW7FKT6FQ6J5H65SXRD6SRGIIDIP6AUDVHRFKN53ZK5H777OPOAO",
] as const;

/**
 * Client en lecture seule.
 */
export function createReadClient() {
  return new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
  });
}

/**
 * Client permettant de signer les transactions avec Freighter.
 */
export function createWalletClient(
  publicKey: string,
) {
  return new Client({
    contractId: CONTRACT_ID,

    networkPassphrase:
      NETWORK_PASSPHRASE,

    rpcUrl: RPC_URL,

    publicKey,

    signTransaction: async (
      xdr: string,
    ) => {
      const result =
        await signTransaction(
          xdr,
          {
            networkPassphrase:
              NETWORK_PASSPHRASE,

            address: publicKey,
          },
        );

      if (result.error) {
        throw new Error(
          result.error,
        );
      }

      return {
        signedTxXdr:
          result.signedTxXdr,

        signerAddress:
          publicKey,
      };
    },
  });
}

/**
 * Récupère une location existante.
 */
export async function getRental(
  rentalId: bigint,
): Promise<Rental> {
  const client =
    createReadClient();

  const transaction =
    await client.get_rental({
      rental_id: rentalId,
    });

  return transaction.result;
}

/**
 * XLM -> stroops.
 *
 * 1 XLM = 10 000 000 stroops.
 */
export function xlmToStroops(
  amount: string,
): bigint {
  const value =
    Number(amount);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      "Montant XLM invalide.",
    );
  }

  return BigInt(
    Math.round(
      value * 10_000_000,
    ),
  );
}

/**
 * Stroops -> XLM.
 */
export function stroopsToXlm(
  amount: bigint,
): string {
  return (
    Number(amount) /
    10_000_000
  ).toFixed(2);
}

/**
 * Transforme un hash hexadécimal
 * de 32 bytes en Buffer.
 */
export function hexToBuffer(
  hex: string,
): Buffer {
  const clean =
    hex
      .trim()
      .replace(/^0x/, "");

  if (
    !/^[0-9a-fA-F]{64}$/.test(
      clean,
    )
  ) {
    throw new Error(
      "Le hash doit contenir exactement 64 caractères hexadécimaux.",
    );
  }

  return Buffer.from(
    clean,
    "hex",
  );
}

/**
 * Génère un hash de test
 * de 32 bytes.
 */
export function randomEvidenceHash(): string {
  const bytes =
    new Uint8Array(32);

  crypto.getRandomValues(
    bytes,
  );

  return Array.from(bytes)
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

export type {
  Rental,
};