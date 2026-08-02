import Link from "next/link";
import LegalShell from "@/components/LegalShell";

export const metadata = {
  title: "환불·청약철회 — 증명사진 -단정-",
};

export default function RefundPage() {
  return (
    <LegalShell title="환불·청약철회 정책">
      <section className="rounded-xl border border-accent/25 bg-accent-soft/40 p-4 text-sm text-ink-800">
        <p className="font-semibold text-accent-deep">핵심</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>다운로드하지 않았다고 자동 환불되지 않습니다.</strong>
          </li>
          <li>
            결제 후 만든 컷은 먼저 <strong>「이 컷 받기」</strong>로 받아 보시고, 아쉬우면{" "}
            <strong>다시 만들기 · A/S</strong>를 이용해 주세요.
          </li>
          <li>
            환불은 <strong>사유 제출 → 운영자 검토·승인</strong> 후에만 진행됩니다. (즉시·자동 환불
            없음)
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">1. 상품 성격</h2>
        <p className="mt-2">
          증명사진 -단정- 상품은 「문화산업진흥 기본법」상 디지털콘텐츠에 해당하는{" "}
          <strong>디지털 이미지 파일</strong>입니다. 실물 배송이 없습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">2. 결제 후 제공</h2>
        <p className="mt-2">
          결제 전 무료 미리보기는 없습니다. 결제 완료 후 첫 컷 생성·열람이 가능하며, 클린 PNG
          다운로드로 디지털콘텐츠 제공이 개시됩니다. 제공 개시 이후의 청약철회는 아래 기준에
          따릅니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">3. 우선 안내 (다운로드·A/S)</h2>
        <p className="mt-2">
          미다운로드·품질 아쉬움이 있어도 <strong>자동으로 돈이 돌아가지 않습니다.</strong> 먼저
          아래를 이용해 주세요.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            만들기 화면에서 <strong>「이 컷 받기」</strong>로 PNG 저장
          </li>
          <li>아쉬우면 「다시 만들기」1회 · 「A/S」1회 (다운로드 전)</li>
          <li>
            추후 도입 예정: 할인권·인화팩 등 <strong>보상형 옵션</strong> (환불을 대체·보완)
          </li>
        </ol>
        <p className="mt-2 text-xs text-ink-500">
          촬영 팁:{" "}
          <Link href="/help#shoot-tips" className="text-accent-deep underline">
            도움말
          </Link>
          {" · "}
          <Link href="/make?resume=1" className="text-accent-deep underline">
            만들기로 돌아가기
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">4. 청약철회·환불이 불가한 경우</h2>
        <p className="mt-2">다음 중 하나에 해당하면 원칙적으로 청약철회·환불이 불가합니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            클린(무워터마크) PNG <strong>다운로드·저장이 시작된 경우</strong> (디지털콘텐츠 제공
            개시)
          </li>
          <li>인화용 레이아웃 클린 PNG를 다운로드한 경우</li>
          <li>“마음에 안 듦”, “안 닮음”, “보정 강도” 등 <strong>주관적 품질 불만</strong></li>
          <li>관공서·여권 등 <strong>공식 제출 반려</strong> (해당 용도 비보장)</li>
          <li>이용자가 직접 인화한 결과물의 매장 품질·규격 문제</li>
          <li>
            <strong>결제만 하고 받지 않은 상태</strong>를 이유로 한 단순 변심 (자동 환불 대상 아님)
          </li>
          <li>
            결제 후 화면에 뜬 컷을 <strong>화면 캡처·촬영·복사</strong>한 뒤 「다운로드 안 함」을
            이유로 환불을 청구하는 경우 (어뷰징)
          </li>
        </ul>
        <p className="mt-3 text-xs text-ink-500">
          결제 화면에서 「다운로드 후 환불 불가」및 화면 캡처 어뷰징 안내에 동의한 뒤에만 결제가
          진행됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">5. “다운로드”·화면 제공의 정의</h2>
        <p className="mt-2">다음 중 하나라도 발생하면 콘텐츠가 제공된 것으로 봅니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>「이 컷 받기」등 버튼으로 파일 전송이 시작된 경우</li>
          <li>워터마크 없는 원본이 단말에 저장 가능한 상태로 전달된 경우</li>
          <li>
            결제 후 생성된 컷이 <strong>화면에 표시</strong>되어 이용자가 확인할 수 있게 된 경우
            (OS·기기 화면 캡처, 다른 기기로 촬영한 경우 포함)
          </li>
        </ul>
        <p className="mt-2 text-sm text-ink-600">
          화면 캡처로 이미지를 확보한 뒤 다운로드 기록만 피하며 환불을 요청하는 행위는 서비스 이용
          제한·환불 거절 사유가 됩니다. 정식 이용은 「이 컷 받기」로 PNG를 받아 주세요.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">6. 환불 검토가 가능한 경우</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>시스템 오류로 결과 제공·다운로드가 객관적으로 불가능한 경우</li>
          <li>중복 결제·명백한 결제 오류</li>
        </ul>
        <p className="mt-2">
          위 사유라도 <strong>즉시 자동 환불되지 않습니다.</strong> 사유를 제출하시면 운영자가
          확인한 뒤 승인 시 환불합니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">7. 환불 신청 절차</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>주문번호와 함께 <strong>사유</strong>를 운영 채널·CS에 제출</li>
          <li>운영자 검토 (반감 없이 상황을 확인합니다)</li>
          <li>
            <strong>승인 후에만</strong> PG 환불 처리 · 거절 시 사유를 안내
          </li>
        </ol>
        <p className="mt-2">
          다운로드가 이미 기록된 주문은 시스템상 환불 접수가 거절될 수 있습니다. 어뷰징(반복 환불
          시도 등)이 확인되면 이용을 제한할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">8. 관련</h2>
        <p className="mt-2">
          <Link href="/legal/terms" className="text-accent-deep underline">
            이용약관
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="text-accent-deep underline">
            개인정보
          </Link>
          {" · "}
          <Link href="/help" className="text-accent-deep underline">
            도움말
          </Link>
        </p>
      </section>
    </LegalShell>
  );
}
