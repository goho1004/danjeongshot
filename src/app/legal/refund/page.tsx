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
        <p className="mt-1">
          워터마크 미리보기로 확인한 뒤 결제합니다.{" "}
          <strong>워터마크 없는 PNG를 다운로드하면 환불이 불가</strong>합니다. 품질이 아쉬우면
          환불보다 <strong>다시 만들기 · A/S</strong>(다른 셀카 가능)를 이용해 주세요.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">1. 상품 성격</h2>
        <p className="mt-2">
          증명사진 -단정- 상품은 「문화산업진흥 기본법」상 디지털콘텐츠에 해당하는{" "}
          <strong>디지털 이미지 파일</strong>입니다. 실물 배송이 없습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">2. 시험 사용 (미리보기)</h2>
        <p className="mt-2">
          결제 전 워터마크가 포함된 미리보기를 제공합니다. 전자상거래 등에서의 소비자보호에 관한
          법률에 따른 <strong>시험 사용 상품</strong>으로, 청약철회가 제한될 수 있는 거래의
          전제입니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">3. 청약철회·환불이 불가한 경우</h2>
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
        </ul>
        <p className="mt-3 text-xs text-ink-500">
          결제 화면에서 「다운로드 후 환불 불가」에 동의한 뒤에만 결제가 진행됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">4. “다운로드”의 정의</h2>
        <p className="mt-2">다음 중 하나라도 발생하면 제공이 개시된 것으로 봅니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>「PNG 다운로드」 등 버튼으로 파일 전송이 시작된 경우</li>
          <li>워터마크 없는 원본이 단말에 저장 가능한 상태로 전달된 경우</li>
        </ul>
        <p className="mt-2">워터마크 미리보기만 본 상태는 클린본 제공에 해당하지 않습니다.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">5. 환불이 가능한 경우</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            결제 후 <strong>클린본 다운로드 전</strong>에, 시스템 오류로 결과 제공이 불가능한 경우
            (전액 환불 또는 재시도)
          </li>
          <li>중복 결제·명백한 결제 오류</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">6. 재생성 · A/S (환불 대체)</h2>
        <p className="mt-2">주관적 품질 불만에는 환불 대신 다음을 제공합니다. (모두 다운로드 전에만)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>결제 후 「다시 만들기」 1회</li>
          <li>그래도 아쉬우면 「A/S 서비스」 1회</li>
        </ol>
        <p className="mt-2">
          재생성·A/S를 모두 사용한 뒤에는 남은 컷 중 선택해 다운로드하시며, 추가 환불은 없습니다.
          품질·변심 환불 요청은 <strong>A/S·다른 셀카 안내</strong>로 먼저 대응합니다. 잘 나오는
          촬영법:{" "}
          <Link href="/help#shoot-tips" className="text-accent-deep underline">
            도움말
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">7. 신청 방법</h2>
        <p className="mt-2">
          환불 해당 사유가 있다고 판단되면 주문번호와 함께 운영 채널로 문의해 주세요. 다운로드가
          이미 기록된 주문은 시스템상 환불이 거절됩니다. 어뷰징(반복 환불 시도 등)이 확인되면 이용을
          제한할 수 있습니다.
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
        </p>
      </section>
    </LegalShell>
  );
}
