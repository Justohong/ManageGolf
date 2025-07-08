import * as db from './db.js';

// 결제 기록 추가
export async function addPaymentRecord(paymentData) {
    try {
        const newPayment = {
            participantId: paymentData.participantId,
            paymentDate: paymentData.paymentDate,
            amount: paymentData.amount,
            paymentType: paymentData.paymentType,
            paymentMethod: paymentData.paymentMethod,
            settlementDate: paymentData.settlementDate || null // 정산일은 선택 사항
        };
        const paymentId = await db.addPayment(newPayment);

        // 결제가 기록되면 해당 회원의 nextPaymentDate를 다음 달로 자동 갱신하고, status를 'active'로 변경
        const participant = await db.getParticipant(paymentData.participantId);
        if (participant) {
            const currentPaymentDate = new Date(paymentData.paymentDate);
            const nextPaymentDate = new Date(currentPaymentDate.getFullYear(), currentPaymentDate.getMonth() + 1, currentPaymentDate.getDate());
            
            participant.nextPaymentDate = nextPaymentDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 저장
            participant.status = 'active';
            await db.updateParticipant(participant);
        }
        return paymentId;
    } catch (error) {
        console.error("Failed to add payment record:", error);
        throw error;
    }
}

// 매일 시스템 로드 시, 모든 회원의 nextPaymentDate를 확인하여 결제일이 지난 회원은 status를 'lapsed'(미납)로 자동 변경
export async function updateParticipantStatuses() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 시간을 0으로 설정하여 날짜만 비교

        const participants = await db.getAllParticipants();
        for (const participant of participants) {
            if (participant.nextPaymentDate) {
                const nextPaymentDate = new Date(participant.nextPaymentDate);
                nextPaymentDate.setHours(0, 0, 0, 0);

                if (nextPaymentDate < today && participant.status !== 'lapsed') {
                    participant.status = 'lapsed';
                    await db.updateParticipant(participant);
                    console.log(`Participant ${participant.name} (${participant.id}) status changed to 'lapsed'.`);
                }
            }
        }
    } catch (error) {
        console.error("Failed to update participant statuses:", error);
        throw error;
    }
}

// 특정 월의 payments 기록을 모두 조회하여, 예상 총액, 실제 결제 총액, 카드 정산 총액, 미납 총액 등을 계산
export async function getMonthlySettlementSummary(year, month) {
    try {
        const payments = await db.getPaymentsByMonth(year, month);
        const allParticipants = await db.getAllParticipants();

        let totalActualPayment = 0;
        let totalSettledAmount = 0;
        let totalExpectedRevenue = 0;
        const lapsedParticipants = [];
        const activeParticipants = allParticipants.filter(p => p.status === 'active');

        // 예상 총 수입 계산 (활성 회원 수 * 월 회비) + 총 레슨비
        // 월 회비는 임의로 50000원으로 가정. 실제 앱에서는 설정에서 가져와야 함.
        const MONTHLY_FEE = 50000; 
        totalExpectedRevenue = activeParticipants.length * MONTHLY_FEE;

        for (const payment of payments) {
            totalActualPayment += payment.amount;
            if (payment.settlementDate) {
                totalSettledAmount += payment.amount;
            }
            if (payment.paymentType === 'lesson_fee') {
                totalExpectedRevenue += payment.amount; // 레슨비는 예상 수입에 추가
            }
        }

        // 미납 회원 목록 및 미납 총액 계산
        for (const participant of allParticipants) {
            if (participant.status === 'lapsed') {
                lapsedParticipants.push(participant);
            }
        }
        // 미납 총액은 월 회비 기준으로 계산 (임시)
        const totalLapsedAmount = lapsedParticipants.length * MONTHLY_FEE; 

        return {
            year,
            month,
            totalExpectedRevenue,
            totalActualPayment,
            totalSettledAmount,
            lapsedParticipants,
            totalLapsedAmount
        };
    } catch (error) {
        console.error("Failed to get monthly settlement summary:", error);
        throw error;
    }
}

// 특정 회원의 결제 내역 조회
export async function getPaymentsForParticipant(participantId) {
    try {
        return await db.getPaymentsForParticipant(participantId);
    } catch (error) {
        console.error("Failed to get payments for participant:", error);
        throw error;
    }
}

// 특정 날짜의 결제 내역 조회
export async function getPaymentsByDate(date) {
    try {
        const payments = await db.getPaymentsByDate(date);
        const allParticipants = await db.getAllParticipants();
        
        const paidParticipants = [];
        const unpaidParticipants = [];

        const paidParticipantIds = new Set(payments.map(p => p.participantId));

        for (const participant of allParticipants) {
            if (paidParticipantIds.has(participant.id)) {
                paidParticipants.push(participant);
            } else {
                // 해당 날짜가 nextPaymentDate이거나 이미 지난 미납 회원
                const nextPaymentDate = participant.nextPaymentDate ? new Date(participant.nextPaymentDate) : null;
                const targetDate = new Date(date);
                targetDate.setHours(0,0,0,0);

                if (nextPaymentDate && nextPaymentDate.setHours(0,0,0,0) <= targetDate.getTime() && participant.status === 'lapsed') {
                    unpaidParticipants.push(participant);
                } else if (nextPaymentDate && nextPaymentDate.setHours(0,0,0,0) === targetDate.getTime() && participant.status !== 'active') {
                    unpaidParticipants.push(participant);
                }
            }
        }
        return { paidParticipants, unpaidParticipants };
    } catch (error) {
        console.error("Failed to get payments by date:", error);
        throw error;
    }
}
