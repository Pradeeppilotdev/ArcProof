// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProofVerifier {
    uint256 constant r = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256 constant alphax = 6104700652668057231299429576321113264096495327347825931643858544444793665750;
    uint256 constant alphay = 10534287031883890999898632591423524367315292973263270700912740480368044322110;
    uint256 constant betax1 = 8785529761077564062287729015425031672439043360615696561636567890621402871807;
    uint256 constant betax2 = 452538520162080374551352016310071108986872718300177081530349068714285386110;
    uint256 constant betay1 = 8364583284399863573384456744334731681779122666174443295650775413886054172592;
    uint256 constant betay2 = 8835854441595507837411003909987897313455230708411592790717194116582993971995;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 19922688627850234756000746674535418820004230789914445659419177408564809494443;
    uint256 constant deltax2 = 19484291256457889143614300801759810769804006960216599515494973970371668149481;
    uint256 constant deltay1 = 15668162689223208698422153510076949362877863588156051075321006490236429833557;
    uint256 constant deltay2 = 11373421932702401468607557491906365393705125650745267844317111036788523719772;

    uint256 constant IC0x = 19717066875806165555105273402911184083119316469075146747496341654736907325779;
    uint256 constant IC0y = 4596486383675542179175395449316824322439488676927722429986697740214472890719;
    uint256 constant IC1x = 19419667567768343490531571300896642326962291128080862067996273108829042499039;
    uint256 constant IC1y = 18154128321104985455965208717022469547135032436369362734530932473562580329049;
    uint256 constant IC2x = 1268516695174344414275823611273904221847781478318313588894431593661516681938;
    uint256 constant IC2y = 3895466281742716981441018627904150578498090128054178368182677059813208223028;
    uint256 constant IC3x = 20032393828316137074514244657399688855467430772094457357580033568690070980045;
    uint256 constant IC3y = 7565756863653533977017476142540690574494643135551700563303912375268386848279;

    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    event ProofVerified(uint256 indexed taskId, address indexed agent, bytes32 outputHash);
    event ProofRejected(uint256 indexed taskId, address indexed agent);

    error InvalidProof();
    error InputMismatch();
    error ScalarOutOfRange();

    function verify(
        uint256 taskId,
        bytes32 outputHash,
        address agentAddr,
        Proof calldata proof,
        uint256[3] calldata publicSignals
    ) external returns (bool valid) {
        if (publicSignals[0] != taskId)                      revert InputMismatch();
        if (publicSignals[1] != uint256(outputHash))         revert InputMismatch();
        if (publicSignals[2] != uint256(uint160(agentAddr))) revert InputMismatch();

        for (uint256 i = 0; i < 3; i++) {
            if (publicSignals[i] >= r) revert ScalarOutOfRange();
        }

        valid = _groth16Verify(proof, publicSignals);

        if (valid) {
            emit ProofVerified(taskId, agentAddr, outputHash);
        } else {
            emit ProofRejected(taskId, agentAddr);
            revert InvalidProof();
        }
    }

    function _groth16Verify(
        Proof calldata proof,
        uint256[3] calldata publicSignals
    ) internal view returns (bool) {
        assembly {
            let pMem := mload(0x40)
            mstore(0x40, add(pMem, 896))

            if iszero(lt(calldataload(add(publicSignals, 0)), r)) { mstore(0, 0) return(0, 0x20) }
            if iszero(lt(calldataload(add(publicSignals, 32)), r)) { mstore(0, 0) return(0, 0x20) }
            if iszero(lt(calldataload(add(publicSignals, 64)), r)) { mstore(0, 0) return(0, 0x20) }

            let proofA := proof
            let proofB := add(proof, 64)
            let proofC := add(proof, 192)

            let _pVk := pMem
            let _pPairing := add(pMem, 128)

            mstore(_pVk, IC0x)
            mstore(add(_pVk, 32), IC0y)

            {
                let mIn := mload(0x40)
                let s
                let success

                mstore(mIn, IC1x)
                mstore(add(mIn, 32), IC1y)
                mstore(add(mIn, 64), calldataload(add(publicSignals, 0)))
                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
                mstore(add(mIn, 64), mload(_pVk))
                mstore(add(mIn, 96), mload(add(_pVk, 32)))
                success := staticcall(sub(gas(), 2000), 6, mIn, 128, _pVk, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
            }

            {
                let mIn := mload(0x40)
                let success

                mstore(mIn, IC2x)
                mstore(add(mIn, 32), IC2y)
                mstore(add(mIn, 64), calldataload(add(publicSignals, 32)))
                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
                mstore(add(mIn, 64), mload(_pVk))
                mstore(add(mIn, 96), mload(add(_pVk, 32)))
                success := staticcall(sub(gas(), 2000), 6, mIn, 128, _pVk, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
            }

            {
                let mIn := mload(0x40)
                let success

                mstore(mIn, IC3x)
                mstore(add(mIn, 32), IC3y)
                mstore(add(mIn, 64), calldataload(add(publicSignals, 64)))
                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
                mstore(add(mIn, 64), mload(_pVk))
                mstore(add(mIn, 96), mload(add(_pVk, 32)))
                success := staticcall(sub(gas(), 2000), 6, mIn, 128, _pVk, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
            }

            mstore(_pPairing, calldataload(proofA))
            mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(proofA, 32))), q))

            mstore(add(_pPairing, 64), calldataload(proofB))
            mstore(add(_pPairing, 96), calldataload(add(proofB, 32)))
            mstore(add(_pPairing, 128), calldataload(add(proofB, 64)))
            mstore(add(_pPairing, 160), calldataload(add(proofB, 96)))

            mstore(add(_pPairing, 192), alphax)
            mstore(add(_pPairing, 224), alphay)

            mstore(add(_pPairing, 256), betax1)
            mstore(add(_pPairing, 288), betax2)
            mstore(add(_pPairing, 320), betay1)
            mstore(add(_pPairing, 352), betay2)

            mstore(add(_pPairing, 384), mload(_pVk))
            mstore(add(_pPairing, 416), mload(add(_pVk, 32)))

            mstore(add(_pPairing, 448), gammax1)
            mstore(add(_pPairing, 480), gammax2)
            mstore(add(_pPairing, 512), gammay1)
            mstore(add(_pPairing, 544), gammay2)

            mstore(add(_pPairing, 576), calldataload(proofC))
            mstore(add(_pPairing, 608), calldataload(add(proofC, 32)))

            mstore(add(_pPairing, 640), deltax1)
            mstore(add(_pPairing, 672), deltax2)
            mstore(add(_pPairing, 704), deltay1)
            mstore(add(_pPairing, 736), deltay2)

            let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)
            let isValid := and(success, mload(_pPairing))

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}
