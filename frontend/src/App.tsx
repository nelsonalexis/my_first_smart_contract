import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isConnected,
  requestAccess,
} from "@stellar/freighter-api";

import {
  ARBITRATORS,
  CONTRACT_ID,
  XLM_TOKEN,
  createWalletClient,
  getRental,
  hexToBuffer,
  randomEvidenceHash,
  stroopsToXlm,
  xlmToStroops,
} from "./stellar";

import type {
  Rental,
} from "./stellar";

import "./App.css";

type Role =
  | "owner"
  | "renter"
  | "arbitrator"
  | "viewer";

function App() {
  // =====================================================
  // GLOBAL STATE
  // =====================================================

  const [address, setAddress] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    txLoading,
    setTxLoading,
  ] = useState(false);

  // =====================================================
  // CURRENT RENTAL
  // =====================================================

  const [
    rentalId,
    setRentalId,
  ] = useState("1");

  const [
    rental,
    setRental,
  ] =
    useState<Rental | null>(
      null,
    );

  // =====================================================
  // CREATE RENTAL
  // =====================================================

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    newRentalId,
    setNewRentalId,
  ] = useState("");

  const [
    renterAddress,
    setRenterAddress,
  ] = useState("");

  const [
    depositAmount,
    setDepositAmount,
  ] = useState("10");

  const [
    initialHash,
    setInitialHash,
  ] = useState(
    randomEvidenceHash(),
  );

  // =====================================================
  // RETURN
  // =====================================================

  const [
    finalHash,
    setFinalHash,
  ] = useState(
    randomEvidenceHash(),
  );

  // =====================================================
  // CLAIM
  // =====================================================

  const [
    claimAmount,
    setClaimAmount,
  ] = useState("");

  const [
    claimHash,
    setClaimHash,
  ] = useState(
    randomEvidenceHash(),
  );

  // =====================================================
  // ARBITRATION
  // =====================================================

  const [
    voteAmount,
    setVoteAmount,
  ] = useState("");

  // =====================================================
  // HELPERS
  // =====================================================

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function shortAddress(
    value: string,
  ) {
    if (!value) {
      return "";
    }

    return `${value.slice(
      0,
      6,
    )}...${value.slice(-6)}`;
  }

  // =====================================================
  // ROLE
  // =====================================================

  const role: Role =
    useMemo(() => {
      if (
        !rental ||
        !address
      ) {
        return "viewer";
      }

      if (
        rental.owner ===
        address
      ) {
        return "owner";
      }

      if (
        rental.renter ===
        address
      ) {
        return "renter";
      }

      if (
        rental.arbitrator_1 ===
          address ||
        rental.arbitrator_2 ===
          address ||
        rental.arbitrator_3 ===
          address
      ) {
        return "arbitrator";
      }

      return "viewer";
    }, [rental, address]);

  // =====================================================
  // WALLET
  // =====================================================

  async function connectWallet() {
    try {
      clearMessages();

      const connection =
        await isConnected();

      if (
        !connection.isConnected
      ) {
        throw new Error(
          "Freighter n'est pas installé ou n'est pas disponible.",
        );
      }

      const result =
        await requestAccess();

      if (result.error) {
        throw new Error(
          result.error,
        );
      }

      setAddress(
        result.address,
      );

      setMessage(
        "Wallet connecté.",
      );
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(err),
      );
    }
  }

  // =====================================================
  // READ RENTAL
  // =====================================================

  async function refreshRental(
    id?: string,
  ) {
    const selectedId =
      id ?? rentalId;

    try {
      setLoading(true);

      clearMessages();

      if (!selectedId) {
        throw new Error(
          "Entre un ID de location.",
        );
      }

      const number =
        Number(selectedId);

      if (
        !Number.isInteger(
          number,
        ) ||
        number <= 0
      ) {
        throw new Error(
          "ID de location invalide.",
        );
      }

      const result =
        await getRental(
          BigInt(
            selectedId,
          ),
        );

      setRental(result);

      setRentalId(
        selectedId,
      );
    } catch (err) {
      console.error(err);

      setRental(null);

      setError(
        "Cette location n'existe pas ou ne peut pas être chargée.",
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // GENERIC TRANSACTION
  // =====================================================

  async function executeTransaction(
    name: string,
    buildTransaction: (
      client: ReturnType<
        typeof createWalletClient
      >,
    ) => Promise<any>,
  ): Promise<boolean> {
    if (!address) {
      setError(
        "Connecte Freighter avant de continuer.",
      );

      return false;
    }

    try {
      setTxLoading(true);

      clearMessages();

      setMessage(
        `${name} : préparation...`,
      );

      const client =
        createWalletClient(
          address,
        );

      /*
       * La méthode du contrat :
       * - construit
       * - prépare
       * - simule
       * la transaction.
       */
      const transaction =
        await buildTransaction(
          client,
        );

      setMessage(
        `${name} : signature requise dans Freighter.`,
      );

      /*
       * Le signer Freighter se trouve
       * déjà dans createWalletClient().
       */
      await transaction.signAndSend();

      setMessage(
        `${name} : transaction confirmée.`,
      );

      return true;
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(err),
      );

      return false;
    } finally {
      setTxLoading(false);
    }
  }

  // =====================================================
  // CREATE RENTAL
  // =====================================================

  async function createRental() {
    try {
      clearMessages();

      if (!address) {
        throw new Error(
          "Connecte le wallet propriétaire.",
        );
      }

      if (!newRentalId) {
        throw new Error(
          "Entre un ID de location.",
        );
      }

      if (
        !renterAddress.trim()
      ) {
        throw new Error(
          "Entre l'adresse du locataire.",
        );
      }

      if (
        renterAddress.trim() ===
        address
      ) {
        throw new Error(
          "Le propriétaire et le locataire doivent être différents.",
        );
      }

      const id =
        BigInt(newRentalId);

      const success =
        await executeTransaction(
          "Création de la location",

          (client) =>
            client.create_rental(
              {
                rental_id:
                  id,

                renter:
                  renterAddress.trim(),

                owner:
                  address,

                token:
                  XLM_TOKEN,

                deposit_amount:
                  xlmToStroops(
                    depositAmount,
                  ),

                initial_evidence_hash:
                  hexToBuffer(
                    initialHash,
                  ),

                arbitrator_1:
                  ARBITRATORS[0],

                arbitrator_2:
                  ARBITRATORS[1],

                arbitrator_3:
                  ARBITRATORS[2],
              },
            ),
        );

      if (!success) {
        return;
      }

      /*
       * IMPORTANT:
       * pas de get_rental automatique ici.
       */

      setRental(null);

      setRentalId(
        newRentalId,
      );

      setShowCreate(
        false,
      );

      setMessage(
        `Location #${newRentalId} créée. Clique maintenant sur Rechercher pour la charger.`,
      );

      setNewRentalId("");

      setRenterAddress("");

      setDepositAmount("10");

      setInitialHash(
        randomEvidenceHash(),
      );
    } catch (err) {
      console.error(err);

      setError(
        getErrorMessage(err),
      );
    }
  }

  // =====================================================
  // ACCEPT RENTAL
  // =====================================================

  async function acceptRental() {
    const success =
      await executeTransaction(
        "Acceptation de la location",

        (client) =>
          client.accept_rental(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // DEPOSIT
  // =====================================================

  async function deposit() {
    const success =
      await executeTransaction(
        "Dépôt de la caution",

        (client) =>
          client.deposit({
            rental_id:
              BigInt(
                rentalId,
              ),
          }),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // START
  // =====================================================

  async function renterStart() {
    const success =
      await executeTransaction(
        "Validation locataire",

        (client) =>
          client.renter_start(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  async function ownerStart() {
    const success =
      await executeTransaction(
        "Validation propriétaire",

        (client) =>
          client.owner_start(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // RETURN
  // =====================================================

  async function reportReturn() {
    const success =
      await executeTransaction(
        "Signalement du retour",

        (client) =>
          client.report_return(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  async function renterConfirmReturn() {
    const success =
      await executeTransaction(
        "Confirmation du retour locataire",

        (client) =>
          client.renter_confirm_return(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),

              final_evidence_hash:
                hexToBuffer(
                  finalHash,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  async function ownerConfirmReturn() {
    const success =
      await executeTransaction(
        "Confirmation du retour propriétaire",

        (client) =>
          client.owner_confirm_return(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),

              final_evidence_hash:
                hexToBuffer(
                  finalHash,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // RELEASE
  // =====================================================

  async function releaseNoClaim() {
    const success =
      await executeTransaction(
        "Libération de la caution",

        (client) =>
          client.release_no_claim(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // CLAIM
  // =====================================================

  async function makeClaim() {
    if (!claimAmount) {
      setError(
        "Entre le montant réclamé.",
      );

      return;
    }

    const success =
      await executeTransaction(
        "Création de la réclamation",

        (client) =>
          client.make_claim(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),

              amount:
                xlmToStroops(
                  claimAmount,
                ),

              evidence_hash:
                hexToBuffer(
                  claimHash,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  async function acceptClaim() {
    const success =
      await executeTransaction(
        "Acceptation de la réclamation",

        (client) =>
          client.accept_claim(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  async function disputeClaim() {
    const success =
      await executeTransaction(
        "Contestation de la réclamation",

        (client) =>
          client.dispute_claim(
            {
              rental_id:
                BigInt(
                  rentalId,
                ),
            },
          ),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // ARBITRATION
  // =====================================================

  async function vote() {
    if (!voteAmount) {
      setError(
        "Entre le montant attribué au propriétaire.",
      );

      return;
    }

    const success =
      await executeTransaction(
        "Vote de l'arbitre",

        (client) =>
          client.vote({
            rental_id:
              BigInt(
                rentalId,
              ),

            arbitrator:
              address,

            vote_amount:
              xlmToStroops(
                voteAmount,
              ),
          }),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // CANCEL
  // =====================================================

  async function cancelRental() {
    const success =
      await executeTransaction(
        "Annulation de la location",

        (client) =>
          client.cancel({
            rental_id:
              BigInt(
                rentalId,
              ),
          }),
      );

    if (success) {
      await refreshRental(
        rentalId,
      );
    }
  }

  // =====================================================
  // AUTO CONNECT
  // =====================================================

  useEffect(() => {
    async function reconnect() {
      try {
        const connection =
          await isConnected();

        if (
          !connection.isConnected
        ) {
          return;
        }

        const result =
          await requestAccess();

        if (!result.error) {
          setAddress(
            result.address,
          );
        }
      } catch {
        // Wallet absent ou verrouillé.
      }
    }

    void reconnect();
  }, []);

  // =====================================================
  // ACTIONS UI
  // =====================================================

  function renderActions() {
    if (!rental) {
      return null;
    }

    const status =
      rental.status.tag;

    return (
      <section className="actions-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              ACTIONS
            </span>

            <h2>
              Que voulez-vous faire ?
            </h2>
          </div>

          <span className="role">
            {formatRole(role)}
          </span>
        </div>

        <div className="actions-grid">
          {status ===
            "Created" &&
            role ===
              "renter" && (
              <ActionCard
                title="Accepter la location"
                description="Confirmez que vous acceptez cette location."
                button="Accepter la location"
                onClick={
                  acceptRental
                }
              />
            )}

          {status ===
            "Created" &&
            role ===
              "owner" && (
              <ActionCard
                title="En attente du locataire"
                description="Le locataire doit maintenant accepter la location."
                disabled
              />
            )}

          {status ===
            "Accepted" &&
            role ===
              "renter" && (
              <ActionCard
                title="Déposer la caution"
                description={`${stroopsToXlm(
                  rental.deposit_amount,
                )} XLM seront verrouillés dans le smart contract.`}
                button="Déposer la caution"
                onClick={
                  deposit
                }
              />
            )}

          {status ===
            "Accepted" &&
            role ===
              "owner" && (
              <ActionCard
                title="En attente de la caution"
                description="Le locataire doit maintenant déposer la caution."
                disabled
              />
            )}

          {status ===
            "Funded" &&
            role ===
              "renter" && (
              <ActionCard
                title="Valider le départ"
                description={
                  rental.renter_start_approved
                    ? "Votre validation est enregistrée."
                    : "Confirmez l'état initial du véhicule."
                }
                button={
                  rental.renter_start_approved
                    ? undefined
                    : "Valider côté locataire"
                }
                onClick={
                  renterStart
                }
                disabled={
                  rental.renter_start_approved
                }
              />
            )}

          {status ===
            "Funded" &&
            role ===
              "owner" && (
              <ActionCard
                title="Valider le départ"
                description={
                  rental.owner_start_approved
                    ? "Votre validation est enregistrée."
                    : "Confirmez l'état initial du véhicule."
                }
                button={
                  rental.owner_start_approved
                    ? undefined
                    : "Valider côté propriétaire"
                }
                onClick={
                  ownerStart
                }
                disabled={
                  rental.owner_start_approved
                }
              />
            )}

          {status ===
            "Active" &&
            role ===
              "renter" && (
              <ActionCard
                title="Retour du véhicule"
                description="Signalez que le véhicule a été restitué."
                button="Signaler le retour"
                onClick={
                  reportReturn
                }
              />
            )}

          {status ===
            "Active" &&
            role ===
              "owner" && (
              <ActionCard
                title="Location en cours"
                description="Le locataire signalera le retour du véhicule."
                disabled
              />
            )}

          {status ===
              "ReturnReported" &&
            (role ===
              "owner" ||
              role ===
                "renter") && (
              <div className="action-card">
                <h3>
                  Confirmer le retour
                </h3>

                <p>
                  Confirmez l'état des
                  lieux de retour.
                </p>

                <label>
                  Hash de l'état des
                  lieux
                </label>

                <input
                  value={
                    finalHash
                  }
                  onChange={(
                    event,
                  ) =>
                    setFinalHash(
                      event
                        .target
                        .value,
                    )
                  }
                />

                <button
                  className="action-button"
                  disabled={
                    txLoading
                  }
                  onClick={
                    role ===
                    "owner"
                      ? ownerConfirmReturn
                      : renterConfirmReturn
                  }
                >
                  Confirmer le retour
                </button>
              </div>
            )}

          {status ===
              "VehicleReturned" &&
            role ===
              "owner" && (
              <div className="action-card">
                <h3>
                  Réclamation
                </h3>

                <p>
                  En cas de dommage,
                  indiquez le montant
                  réclamé.
                </p>

                <label>
                  Montant réclamé
                  (XLM)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={
                    claimAmount
                  }
                  onChange={(
                    event,
                  ) =>
                    setClaimAmount(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ex : 4"
                />

                <label>
                  Hash de la preuve
                </label>

                <input
                  value={
                    claimHash
                  }
                  onChange={(
                    event,
                  ) =>
                    setClaimHash(
                      event
                        .target
                        .value,
                    )
                  }
                />

                <button
                  className="action-button danger-button"
                  disabled={
                    txLoading ||
                    !claimAmount
                  }
                  onClick={
                    makeClaim
                  }
                >
                  Faire une réclamation
                </button>
              </div>
            )}

          {status ===
            "VehicleReturned" && (
            <ActionCard
              title="Aucun litige"
              description="Libérer la caution vers le locataire."
              button="Libérer la caution"
              onClick={
                releaseNoClaim
              }
            />
          )}

          {status ===
            "Claim" &&
            role ===
              "renter" && (
              <>
                <ActionCard
                  title="Accepter la réclamation"
                  description={`${stroopsToXlm(
                    rental.claim_amount,
                  )} XLM seront attribués au propriétaire.`}
                  button="Accepter"
                  onClick={
                    acceptClaim
                  }
                />

                <ActionCard
                  title="Contester"
                  description="Soumettre le litige aux arbitres."
                  button="Contester la réclamation"
                  onClick={
                    disputeClaim
                  }
                  danger
                />
              </>
            )}

          {status ===
              "Disputed" &&
            role ===
              "arbitrator" && (
              <div className="action-card">
                <h3>
                  Arbitrage
                </h3>

                <p>
                  Montant réclamé :{" "}
                  {stroopsToXlm(
                    rental.claim_amount,
                  )}{" "}
                  XLM
                </p>

                <label>
                  Montant attribué au
                  propriétaire
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={
                    voteAmount
                  }
                  onChange={(
                    event,
                  ) =>
                    setVoteAmount(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ex : 2.5"
                />

                <button
                  className="action-button"
                  disabled={
                    txLoading ||
                    !voteAmount
                  }
                  onClick={vote}
                >
                  Envoyer mon vote
                </button>
              </div>
            )}

          {(status ===
            "Created" ||
            status ===
              "Accepted" ||
            status ===
              "Funded") &&
            (role ===
              "owner" ||
              role ===
                "renter") && (
              <ActionCard
                title="Annuler la location"
                description="Annuler cette location avant son démarrage."
                button="Annuler"
                onClick={
                  cancelRental
                }
                danger
              />
            )}

          {status ===
            "Resolved" && (
            <ActionCard
              title="Location terminée"
              description="La caution a été distribuée."
              disabled
            />
          )}

          {status ===
            "Cancelled" && (
            <ActionCard
              title="Location annulée"
              description="Cette location a été annulée."
              disabled
            />
          )}
        </div>
      </section>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <div className="logo">
            D
          </div>

          <div>
            <strong>
              DriveEscrow
            </strong>

            <span>
              Stellar Testnet
            </span>
          </div>
        </div>

        <div className="nav-actions">
          {address && (
            <button
              className="secondary-button"
              onClick={() => {
                clearMessages();

                setInitialHash(
                  randomEvidenceHash(),
                );

                setShowCreate(
                  true,
                );
              }}
            >
              + Nouvelle location
            </button>
          )}

          {address ? (
            <div className="wallet-connected">
              <span className="status-dot" />

              {shortAddress(
                address,
              )}
            </div>
          ) : (
            <button
              className="connect-button"
              onClick={
                connectWallet
              }
            >
              Connecter Freighter
            </button>
          )}
        </div>
      </nav>

      <main className="main">
        <section className="hero">
          <div className="badge">
            SMART ESCROW • STELLAR
          </div>

          <h1>
            La caution automobile
            <br />

            <span>
              sans rapport de force.
            </span>
          </h1>

          <p>
            La caution est verrouillée
            dans un smart contract et
            n'appartient ni au
            propriétaire ni au
            locataire jusqu'à la
            résolution de la location.
          </p>

          {!address && (
            <button
              className="primary-button"
              onClick={
                connectWallet
              }
            >
              Connecter mon wallet
            </button>
          )}
        </section>

        <section className="search-section">
          <div className="search-box">
            <div>
              <span className="eyebrow">
                LOCATION
              </span>

              <h2>
                Consulter une location
              </h2>
            </div>

            <div className="search-controls">
              <input
                type="number"
                min="1"
                value={rentalId}
                onChange={(
                  event,
                ) =>
                  setRentalId(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="ID"
              />

              <button
                className="primary-button search-button"
                onClick={() =>
                  refreshRental()
                }
                disabled={
                  loading
                }
              >
                {loading
                  ? "Chargement..."
                  : "Rechercher"}
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="alert success">
            {message}
          </div>
        )}

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        {rental && (
          <>
            <section className="rental-card">
              <div className="rental-header">
                <div>
                  <span className="eyebrow">
                    LOCATION
                  </span>

                  <h2>
                    #
                    {rental.rental_id.toString()}
                  </h2>
                </div>

                <span
                  className={`status status-${rental.status.tag}`}
                >
                  {formatStatus(
                    rental.status
                      .tag,
                  )}
                </span>
              </div>

              <div className="amount">
                <span>
                  Caution
                </span>

                <strong>
                  {stroopsToXlm(
                    rental.deposit_amount,
                  )}{" "}
                  XLM
                </strong>
              </div>

              <div className="details-grid">
                <Detail
                  label="Propriétaire"
                  value={shortAddress(
                    rental.owner,
                  )}
                  full={
                    rental.owner
                  }
                />

                <Detail
                  label="Locataire"
                  value={shortAddress(
                    rental.renter,
                  )}
                  full={
                    rental.renter
                  }
                />

                <Detail
                  label="Token"
                  value="Native XLM"
                  full={
                    rental.token
                  }
                />

                <Detail
                  label="Votre rôle"
                  value={formatRole(
                    role,
                  )}
                />
              </div>

              <RentalTimeline
                rental={
                  rental
                }
              />
            </section>

            {renderActions()}
          </>
        )}

        {!rental && (
          <section className="features">
            <Feature
              number="01"
              title="Caution neutre"
              text="Les fonds sont détenus par le smart contract et non par le propriétaire."
            />

            <Feature
              number="02"
              title="Preuves vérifiables"
              text="Les empreintes cryptographiques des états des lieux sont enregistrées dans le contrat."
            />

            <Feature
              number="03"
              title="Arbitrage 2/3"
              text="Un désaccord peut être soumis à trois arbitres."
            />
          </section>
        )}
      </main>

      {showCreate && (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              className="close-button"
              onClick={() =>
                setShowCreate(
                  false,
                )
              }
            >
              ×
            </button>

            <span className="eyebrow">
              NOUVELLE LOCATION
            </span>

            <h2>
              Créer un escrow
            </h2>

            <label>
              ID de la location
            </label>

            <input
              type="number"
              min="1"
              value={
                newRentalId
              }
              onChange={(
                event,
              ) =>
                setNewRentalId(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Ex : 3"
            />

            <label>
              Adresse Stellar du
              locataire
            </label>

            <input
              value={
                renterAddress
              }
              onChange={(
                event,
              ) =>
                setRenterAddress(
                  event
                    .target
                    .value,
                )
              }
              placeholder="G..."
            />

            <label>
              Caution en XLM
            </label>

            <input
              type="number"
              min="0.0000001"
              step="0.1"
              value={
                depositAmount
              }
              onChange={(
                event,
              ) =>
                setDepositAmount(
                  event
                    .target
                    .value,
                )
              }
            />

            <label>
              Hash de l'état des lieux
              initial
            </label>

            <textarea
              value={
                initialHash
              }
              onChange={(
                event,
              ) =>
                setInitialHash(
                  event
                    .target
                    .value,
                )
              }
            />

            <div className="arbitrator-info">
              <strong>
                Arbitrage
              </strong>

              <span>
                3 arbitres configurés
              </span>
            </div>

            <button
              className="primary-button modal-submit"
              disabled={
                txLoading
              }
              onClick={
                createRental
              }
            >
              {txLoading
                ? "Transaction..."
                : "Créer la location"}
            </button>
          </div>
        </div>
      )}

      {txLoading && (
        <div className="transaction-overlay">
          <div className="spinner" />

          <strong>
            Transaction Stellar en
            cours...
          </strong>

          <span>
            Validez la transaction
            dans Freighter.
          </span>
        </div>
      )}

      <footer>
        <span>
          DriveEscrow
        </span>

        <span>
          Contract{" "}
          {shortAddress(
            CONTRACT_ID,
          )}
        </span>

        <span>
          Testnet • MVP
        </span>
      </footer>
    </div>
  );
}

// =====================================================
// SMALL COMPONENTS
// =====================================================

function ActionCard({
  title,
  description,
  button,
  onClick,
  disabled,
  danger,
}: {
  title: string;
  description: string;
  button?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="action-card">
      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

      {button && (
        <button
          className={`action-button ${
            danger
              ? "danger-button"
              : ""
          }`}
          onClick={
            onClick
          }
          disabled={
            disabled
          }
        >
          {button}
        </button>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: string;
}) {
  return (
    <div className="detail">
      <span>
        {label}
      </span>

      <strong
        title={full}
      >
        {value}
      </strong>
    </div>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>
        {number}
      </span>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>
    </article>
  );
}

function RentalTimeline({
  rental,
}: {
  rental: Rental;
}) {
  const states = [
    "Created",
    "Accepted",
    "Funded",
    "Active",
    "ReturnReported",
    "VehicleReturned",
    "Resolved",
  ];

  const currentIndex =
    states.indexOf(
      rental.status.tag,
    );

  return (
    <div className="timeline">
      {states.map(
        (
          state,
          index,
        ) => {
          const active =
            currentIndex >= 0 &&
            index <=
              currentIndex;

          return (
            <div
              key={state}
              className={`timeline-step ${
                active
                  ? "timeline-active"
                  : ""
              }`}
            >
              <div className="timeline-dot">
                {index <
                currentIndex
                  ? "✓"
                  : index +
                    1}
              </div>

              <span>
                {formatStatus(
                  state,
                )}
              </span>
            </div>
          );
        },
      )}
    </div>
  );
}

// =====================================================
// FORMATTERS
// =====================================================

function formatRole(
  role: Role,
) {
  const labels: Record<
    Role,
    string
  > = {
    owner: "Propriétaire",
    renter: "Locataire",
    arbitrator: "Arbitre",
    viewer: "Observateur",
  };

  return labels[role];
}

function formatStatus(
  status: string,
) {
  const labels: Record<
    string,
    string
  > = {
    Created: "Créée",
    Accepted: "Acceptée",
    Funded:
      "Caution déposée",
    Active: "En cours",
    ReturnReported:
      "Retour signalé",
    VehicleReturned:
      "Véhicule restitué",
    Claim: "Réclamation",
    Disputed: "Litige",
    Resolved: "Terminée",
    Cancelled: "Annulée",
  };

  return (
    labels[status] ??
    status
  );
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  return "Une erreur inconnue est survenue.";
}

export default App;