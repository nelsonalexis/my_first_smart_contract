#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RentalStatus {
    Created,
    Accepted,
    Funded,
    Active,
    ReturnReported,
    VehicleReturned,
    Claim,
    Disputed,
    Resolved,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Rental {
    pub rental_id: u64,

    pub renter: Address,
    pub owner: Address,
    pub token: Address,

    pub deposit_amount: i128,

    pub status: RentalStatus,

    // Hash de l'état initial.
    pub initial_evidence_hash: BytesN<32>,

    // Validation de la remise initiale.
    pub renter_start_approved: bool,
    pub owner_start_approved: bool,

    // Validation du retour.
    pub renter_return_approved: bool,
    pub owner_return_approved: bool,

    // Hash de l'état final.
    pub final_evidence_hash: BytesN<32>,

    // Réclamation
    pub claim_amount: i128,
    pub claim_evidence_hash: BytesN<32>,

    // Partie déjà rendue au locataire
    // lorsqu'une réclamation est créée.
    pub undisputed_released: i128,

    // Arbitrage
    pub arbitrator_1: Address,
    pub arbitrator_2: Address,
    pub arbitrator_3: Address,

    pub vote_1: i128,
    pub vote_2: i128,
    pub vote_3: i128,

    pub voted_1: bool,
    pub voted_2: bool,
    pub voted_3: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Rental(u64),
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // ========================================================
    // CREATE
    // ========================================================

    pub fn create_rental(
        env: Env,
        rental_id: u64,
        renter: Address,
        owner: Address,
        token: Address,
        deposit_amount: i128,
        initial_evidence_hash: BytesN<32>,
        arbitrator_1: Address,
        arbitrator_2: Address,
        arbitrator_3: Address,
    ) -> Rental {
        owner.require_auth();

        if deposit_amount <= 0 {
            panic!("Invalid deposit");
        }

        if renter == owner {
            panic!("Renter and owner must differ");
        }

        if arbitrator_1 == arbitrator_2
            || arbitrator_1 == arbitrator_3
            || arbitrator_2 == arbitrator_3
        {
            panic!("Arbitrators must differ");
        }

        let key = DataKey::Rental(rental_id);

        if env.storage().persistent().has(&key) {
            panic!("Rental already exists");
        }

        let zero_hash = BytesN::from_array(&env, &[0u8; 32]);

        let rental = Rental {
            rental_id,
            renter,
            owner,
            token,
            deposit_amount,

            status: RentalStatus::Created,

            initial_evidence_hash,

            renter_start_approved: false,
            owner_start_approved: false,

            renter_return_approved: false,
            owner_return_approved: false,

            final_evidence_hash: zero_hash.clone(),

            claim_amount: 0,
            claim_evidence_hash: zero_hash,

            undisputed_released: 0,

            arbitrator_1,
            arbitrator_2,
            arbitrator_3,

            vote_1: 0,
            vote_2: 0,
            vote_3: 0,

            voted_1: false,
            voted_2: false,
            voted_3: false,
        };

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // READ
    // ========================================================

    pub fn get_rental(env: Env, rental_id: u64) -> Rental {
        Self::load(&env, rental_id)
    }

    // ========================================================
    // RENTER ACCEPTS CONTRACT + INITIAL HASH
    // ========================================================

    pub fn accept_rental(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::Created {
            panic!("Invalid status");
        }

        rental.status = RentalStatus::Accepted;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // DEPOSIT
    // ========================================================

    pub fn deposit(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::Accepted {
            panic!("Rental not accepted");
        }

        let token_client = token::Client::new(&env, &rental.token);
        let escrow = env.current_contract_address();

        token_client.transfer(
            &rental.renter,
            &escrow,
            &rental.deposit_amount,
        );

        rental.status = RentalStatus::Funded;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // START — RENTER
    // ========================================================

    pub fn renter_start(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::Funded {
            panic!("Rental not funded");
        }

        rental.renter_start_approved = true;

        if rental.owner_start_approved {
            rental.status = RentalStatus::Active;
        }

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // START — OWNER
    // ========================================================

    pub fn owner_start(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.owner.require_auth();

        if rental.status != RentalStatus::Funded {
            panic!("Rental not funded");
        }

        rental.owner_start_approved = true;

        if rental.renter_start_approved {
            rental.status = RentalStatus::Active;
        }

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // CANCEL BEFORE START
    // ========================================================

    pub fn cancel(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.owner.require_auth();
        rental.renter.require_auth();

        if rental.status == RentalStatus::Active
            || rental.status == RentalStatus::ReturnReported
            || rental.status == RentalStatus::VehicleReturned
            || rental.status == RentalStatus::Claim
            || rental.status == RentalStatus::Disputed
            || rental.status == RentalStatus::Resolved
        {
            panic!("Cannot cancel");
        }

        if rental.status == RentalStatus::Funded {
            let token_client = token::Client::new(&env, &rental.token);
            let escrow = env.current_contract_address();

            token_client.transfer(
                &escrow,
                &rental.renter,
                &rental.deposit_amount,
            );
        }

        rental.status = RentalStatus::Cancelled;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // RENTER REPORTS RETURN
    // ========================================================

    pub fn report_return(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::Active {
            panic!("Rental not active");
        }

        rental.status = RentalStatus::ReturnReported;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // RENTER CONFIRMS FINAL INSPECTION
    // ========================================================

    pub fn renter_confirm_return(
        env: Env,
        rental_id: u64,
        final_evidence_hash: BytesN<32>,
    ) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::ReturnReported {
            panic!("Return not reported");
        }

        rental.renter_return_approved = true;
        rental.final_evidence_hash = final_evidence_hash;

        if rental.owner_return_approved {
            rental.status = RentalStatus::VehicleReturned;
        }

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // OWNER CONFIRMS FINAL INSPECTION
    // ========================================================

    pub fn owner_confirm_return(
        env: Env,
        rental_id: u64,
        final_evidence_hash: BytesN<32>,
    ) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.owner.require_auth();

        if rental.status != RentalStatus::ReturnReported {
            panic!("Return not reported");
        }

        rental.owner_return_approved = true;
        rental.final_evidence_hash = final_evidence_hash;

        if rental.renter_return_approved {
            rental.status = RentalStatus::VehicleReturned;
        }

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // NO DAMAGE → FULL REFUND
    // ========================================================

    pub fn release_no_claim(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        if rental.status != RentalStatus::VehicleReturned {
            panic!("Vehicle return not confirmed");
        }

        let token_client = token::Client::new(&env, &rental.token);
        let escrow = env.current_contract_address();

        token_client.transfer(
            &escrow,
            &rental.renter,
            &rental.deposit_amount,
        );

        rental.status = RentalStatus::Resolved;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // OWNER MAKES DAMAGE CLAIM
    // ========================================================

    pub fn make_claim(
        env: Env,
        rental_id: u64,
        amount: i128,
        evidence_hash: BytesN<32>,
    ) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.owner.require_auth();

        if rental.status != RentalStatus::VehicleReturned {
            panic!("Vehicle return not confirmed");
        }

        if amount <= 0 || amount > rental.deposit_amount {
            panic!("Invalid claim amount");
        }

        if rental.claim_amount != 0 {
            panic!("Claim already exists");
        }

        rental.claim_amount = amount;
        rental.claim_evidence_hash = evidence_hash;

        // La partie non réclamée n'est pas litigieuse.
        let undisputed = rental.deposit_amount - amount;

        if undisputed > 0 {
            let token_client =
                token::Client::new(&env, &rental.token);

            let escrow =
                env.current_contract_address();

            token_client.transfer(
                &escrow,
                &rental.renter,
                &undisputed,
            );

            rental.undisputed_released = undisputed;
        }

        rental.status = RentalStatus::Claim;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // RENTER ACCEPTS CLAIM
    // ========================================================

    pub fn accept_claim(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::Claim {
            panic!("No active claim");
        }

        let token_client = token::Client::new(&env, &rental.token);
        let escrow = env.current_contract_address();

        token_client.transfer(
            &escrow,
            &rental.owner,
            &rental.claim_amount,
        );

        rental.status = RentalStatus::Resolved;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // RENTER DISPUTES CLAIM
    // ========================================================

    pub fn dispute_claim(env: Env, rental_id: u64) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        rental.renter.require_auth();

        if rental.status != RentalStatus::Claim {
            panic!("No active claim");
        }

        rental.status = RentalStatus::Disputed;

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // ARBITRATOR VOTE
    //
    // vote_amount = amount of the disputed money
    // that should go to the OWNER.
    // ========================================================

    pub fn vote(
        env: Env,
        rental_id: u64,
        arbitrator: Address,
        vote_amount: i128,
    ) -> Rental {
        let mut rental = Self::load(&env, rental_id);

        arbitrator.require_auth();

        if rental.status != RentalStatus::Disputed {
            panic!("No active dispute");
        }

        if vote_amount < 0 || vote_amount > rental.claim_amount {
            panic!("Invalid vote amount");
        }

        if arbitrator == rental.arbitrator_1 {
            if rental.voted_1 {
                panic!("Already voted");
            }

            rental.vote_1 = vote_amount;
            rental.voted_1 = true;
        } else if arbitrator == rental.arbitrator_2 {
            if rental.voted_2 {
                panic!("Already voted");
            }

            rental.vote_2 = vote_amount;
            rental.voted_2 = true;
        } else if arbitrator == rental.arbitrator_3 {
            if rental.voted_3 {
                panic!("Already voted");
            }

            rental.vote_3 = vote_amount;
            rental.voted_3 = true;
        } else {
            panic!("Not an arbitrator");
        }

        // Deux arbitres doivent voter EXACTEMENT le même montant.
        let mut consensus_found = false;
        let mut owner_award: i128 = 0;

        if rental.voted_1
            && rental.voted_2
            && rental.vote_1 == rental.vote_2
        {
            consensus_found = true;
            owner_award = rental.vote_1;
        }

        if rental.voted_1
            && rental.voted_3
            && rental.vote_1 == rental.vote_3
        {
            consensus_found = true;
            owner_award = rental.vote_1;
        }

        if rental.voted_2
            && rental.voted_3
            && rental.vote_2 == rental.vote_3
        {
            consensus_found = true;
            owner_award = rental.vote_2;
        }

        if consensus_found {
            Self::resolve_dispute(
                &env,
                &mut rental,
                owner_award,
            );
        }

        Self::save(&env, &rental);

        rental
    }

    // ========================================================
    // CONTRACT ADDRESS
    // ========================================================

    pub fn contract_address(env: Env) -> Address {
        env.current_contract_address()
    }

    // ========================================================
    // INTERNAL FUNCTIONS
    // ========================================================

    fn load(env: &Env, rental_id: u64) -> Rental {
        env.storage()
            .persistent()
            .get(&DataKey::Rental(rental_id))
            .expect("Rental not found")
    }

    fn save(env: &Env, rental: &Rental) {
        env.storage()
            .persistent()
            .set(
                &DataKey::Rental(rental.rental_id),
                rental,
            );
    }

    fn resolve_dispute(
        env: &Env,
        rental: &mut Rental,
        owner_award: i128,
    ) {
        if owner_award < 0
            || owner_award > rental.claim_amount
        {
            panic!("Invalid award");
        }

        let token_client =
            token::Client::new(env, &rental.token);

        let escrow =
            env.current_contract_address();

        let renter_award =
            rental.claim_amount - owner_award;

        if owner_award > 0 {
            token_client.transfer(
                &escrow,
                &rental.owner,
                &owner_award,
            );
        }

        if renter_award > 0 {
            token_client.transfer(
                &escrow,
                &rental.renter,
                &renter_award,
            );
        }

        rental.status = RentalStatus::Resolved;
    }
}

mod test;