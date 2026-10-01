#![cfg(test)]

use super::*;

use soroban_sdk::{
    testutils::Address as _,
    token,
    Address,
    BytesN,
    Env,
};

fn hash(env: &Env, value: u8) -> BytesN<32> {
    BytesN::from_array(env, &[value; 32])
}

fn setup() -> (
    Env,
    EscrowContractClient<'static>,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let env = Env::default();

    env.mock_all_auths();

    let contract_id =
        env.register(EscrowContract, ());

    let client =
        EscrowContractClient::new(
            &env,
            &contract_id,
        );

    let renter = Address::generate(&env);
    let owner = Address::generate(&env);

    let arb1 = Address::generate(&env);
    let arb2 = Address::generate(&env);
    let arb3 = Address::generate(&env);

    let token_admin =
        Address::generate(&env);

    let token_address =
        env.register_stellar_asset_contract_v2(
            token_admin,
        )
        .address();

    (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    )
}

fn create_and_fund(
    env: &Env,
    client: &EscrowContractClient,
    renter: &Address,
    owner: &Address,
    token_address: &Address,
    arb1: &Address,
    arb2: &Address,
    arb3: &Address,
) {
    let admin =
        token::StellarAssetClient::new(
            env,
            token_address,
        );

    admin.mint(
        renter,
        &1000,
    );

    client.create_rental(
        &1,
        renter,
        owner,
        token_address,
        &500,
        &hash(env, 1),
        arb1,
        arb2,
        arb3,
    );

    client.accept_rental(&1);

    client.deposit(&1);
}

fn make_active(
    env: &Env,
    client: &EscrowContractClient,
    renter: &Address,
    owner: &Address,
    token_address: &Address,
    arb1: &Address,
    arb2: &Address,
    arb3: &Address,
) {
    create_and_fund(
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    );

    client.renter_start(&1);
    client.owner_start(&1);
}

fn make_returned(
    env: &Env,
    client: &EscrowContractClient,
    renter: &Address,
    owner: &Address,
    token_address: &Address,
    arb1: &Address,
    arb2: &Address,
    arb3: &Address,
) {
    make_active(
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    );

    client.report_return(&1);

    client.renter_confirm_return(
        &1,
        &hash(env, 2),
    );

    client.owner_confirm_return(
        &1,
        &hash(env, 2),
    );
}

#[test]
fn test_full_refund_without_damage() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    let token_client =
        token::Client::new(
            &env,
            &token_address,
        );

    assert_eq!(
        token_client.balance(&renter),
        500
    );

    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        500
    );

    client.release_no_claim(&1);

    assert_eq!(
        token_client.balance(&renter),
        1000
    );

    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        0
    );

    assert_eq!(
        client.get_rental(&1).status,
        RentalStatus::Resolved
    );
}

#[test]
fn test_renter_accepts_damage_claim() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    // Propriétaire réclame 150 sur 500.
    client.make_claim(
        &1,
        &150,
        &hash(&env, 3),
    );

    let token_client =
        token::Client::new(
            &env,
            &token_address,
        );

    // 350 non contestés ont déjà été rendus.
    assert_eq!(
        token_client.balance(&renter),
        850
    );

    // Il reste 150 dans l'escrow.
    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        150
    );

    client.accept_claim(&1);

    assert_eq!(
        token_client.balance(&owner),
        150
    );

    assert_eq!(
        token_client.balance(&renter),
        850
    );

    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        0
    );

    assert_eq!(
        client.get_rental(&1).status,
        RentalStatus::Resolved
    );
}

#[test]
fn test_dispute_owner_wins_full_claim() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    client.make_claim(
        &1,
        &200,
        &hash(&env, 4),
    );

    client.dispute_claim(&1);

    // Deux arbitres accordent les 200 au propriétaire.
    client.vote(
        &1,
        &arb1,
        &200,
    );

    client.vote(
        &1,
        &arb2,
        &200,
    );

    let token_client =
        token::Client::new(
            &env,
            &token_address,
        );

    assert_eq!(
        token_client.balance(&owner),
        200
    );

    // 300 avaient déjà été rendus.
    assert_eq!(
        token_client.balance(&renter),
        800
    );

    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        0
    );

    assert_eq!(
        client.get_rental(&1).status,
        RentalStatus::Resolved
    );
}

#[test]
fn test_partial_arbitration() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    // Réclamation de 200.
    client.make_claim(
        &1,
        &200,
        &hash(&env, 5),
    );

    client.dispute_claim(&1);

    // Les arbitres estiment que seulement
    // 120 doivent aller au propriétaire.
    client.vote(
        &1,
        &arb1,
        &120,
    );

    client.vote(
        &1,
        &arb2,
        &120,
    );

    let token_client =
        token::Client::new(
            &env,
            &token_address,
        );

    assert_eq!(
        token_client.balance(&owner),
        120
    );

    // 300 non contestés +
    // 80 rendus après arbitrage.
    //
    // Le locataire avait 500 après le dépôt :
    // 500 + 300 + 80 = 880.
    assert_eq!(
        token_client.balance(&renter),
        880
    );

    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        0
    );

    assert_eq!(
        client.get_rental(&1).status,
        RentalStatus::Resolved
    );
}

#[test]
fn test_arbitrators_reject_claim() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    client.make_claim(
        &1,
        &200,
        &hash(&env, 6),
    );

    client.dispute_claim(&1);

    // 0 signifie :
    // rien pour le propriétaire.
    client.vote(
        &1,
        &arb1,
        &0,
    );

    client.vote(
        &1,
        &arb3,
        &0,
    );

    let token_client =
        token::Client::new(
            &env,
            &token_address,
        );

    assert_eq!(
        token_client.balance(&owner),
        0
    );

    assert_eq!(
        token_client.balance(&renter),
        1000
    );

    assert_eq!(
        client.get_rental(&1).status,
        RentalStatus::Resolved
    );
}

#[test]
#[should_panic(expected = "Already voted")]
fn test_arbitrator_cannot_vote_twice() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    client.make_claim(
        &1,
        &200,
        &hash(&env, 7),
    );

    client.dispute_claim(&1);

    client.vote(
        &1,
        &arb1,
        &100,
    );

    client.vote(
        &1,
        &arb1,
        &100,
    );
}

#[test]
#[should_panic(expected = "Invalid claim amount")]
fn test_claim_cannot_exceed_deposit() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    make_returned(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    // Caution = 500.
    // Réclamation = 600 → interdite.
    client.make_claim(
        &1,
        &600,
        &hash(&env, 8),
    );
}

#[test]
fn test_cancel_after_funding_refunds_renter() {
    let (
        env,
        client,
        renter,
        owner,
        token_address,
        arb1,
        arb2,
        arb3,
    ) = setup();

    create_and_fund(
        &env,
        &client,
        &renter,
        &owner,
        &token_address,
        &arb1,
        &arb2,
        &arb3,
    );

    let token_client =
        token::Client::new(
            &env,
            &token_address,
        );

    assert_eq!(
        token_client.balance(&renter),
        500
    );

    client.cancel(&1);

    assert_eq!(
        token_client.balance(&renter),
        1000
    );

    assert_eq!(
        token_client.balance(
            &client.contract_address()
        ),
        0
    );

    assert_eq!(
        client.get_rental(&1).status,
        RentalStatus::Cancelled
    );
}