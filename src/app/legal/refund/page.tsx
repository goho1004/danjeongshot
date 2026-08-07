import Link from "next/link";
import LegalShell from "@/components/LegalShell";

export const metadata = {
  title: "환불·청약철회 — 증명사진 -단정-",
};

export default function RefundPage() {
  return (
    <LegalShell title="환불·청약철회 정책">
      <section className="rounded-xl border border-accent/25 bg-accent-soft/40 p-4 text-sm text-ink-800">
        <p className="font-semibold text-accent-deep">한눈에 보기</p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              결제와 제공
            </p>
            <p className="mt-1">
              결제는 증명사진 컷을 <strong>생성·제공</strong>받겠다는{" "}
              <strong>의사표시</strong>입니다. 컷 <strong>생성이 성공</strong>하여 화면에
              나타나거나 전달 가능한 상태가 되면, 디지털콘텐츠{" "}
              <strong>제공이 시작된 것</strong>으로 봅니다.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              환불 (이 항목만)
            </p>
            <p className="mt-1">
              환불은 <strong>시스템 결함에 따른 제품(파일) 미전달</strong>인 경우에만
              검토합니다. 예: 결제 후 시스템 오류로 컷이 생성되지 않음 · 「이 컷 받기」·이메일 등
              정상 전달이 객관적으로 반복 실패 · 중복결제·명백한 결제 오류.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              품질 (환불과 다른 항목)
            </p>
            <p className="mt-1">
              안 닮음·분위기·보정 등 <strong>주관적 품질</strong>은 환불 사유가 아닙니다.
              아쉬우시면 <strong>받기 전</strong> 「다시 만들기」·「A/S」로 맞춰 드립니다.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              미전달이 아닌 경우
            </p>
            <p className="mt-1">
              화면에 컷이 보인 뒤의 단순 변심 · 「이 컷 받기」를 누르지 않음 · 화면 저장·캡처·다른
              기기 촬영 후 「안 받았다」고 하는 경우 · 관공서·여권 등 비보장 용도 반려.
            </p>
          </div>
          <p className="text-xs text-ink-500">
            자동·즉시 환불은 없습니다. 주문번호와 사유를 주시면 운영자가 확인 후 진행합니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">1. 상품 성격</h2>
        <p className="mt-2">
          증명사진 -단정- 상품은 「문화산업진흥 기본법」상 디지털콘텐츠에 해당하는{" "}
          <strong>디지털 이미지 파일</strong>입니다. 실물 배송이 없습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">2. 결제 · 생성 성공 · 제공 개시</h2>
        <p className="mt-2">
          결제 전 무료 미리보기는 없습니다. 결제는 컷을 생성·제공받겠다는{" "}
          <strong>의사표시</strong>이며, 결제 후 <strong>컷 생성이 성공</strong>하면
          디지털콘텐츠 <strong>제공이 개시</strong>된 것으로 봅니다. 제공 개시에는 화면에 컷이
          표시된 상태, 「이 컷 받기」·이메일 등으로 파일이 전달·저장 가능한 상태가 포함됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">3. 품질은 환불과 다른 항목</h2>
        <p className="mt-2">
          품질이 아쉬워도 <strong>자동으로 돈이 돌아가지 않습니다.</strong> 품질은 환불 창이
          아니라 아래 경로로 맞춰 드립니다.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            만들기 화면에서 <strong>「이 컷 받기」</strong>로 PNG 저장
          </li>
          <li>아쉬우면 「다시 만들기」1회 · 「A/S」1회 (받기 전)</li>
          <li>
            추후 도입 예정: 할인권·인화팩 등 <strong>보상형 옵션</strong>
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
        <h2 className="text-base font-semibold text-ink-950">
          4. 환불 검토 — 시스템 결함에 따른 제품 미전달
        </h2>
        <p className="mt-2">
          다음처럼 <strong>우리 쪽 시스템·서비스 장애</strong>로 제품(파일)이{" "}
          <strong>전달되지 못한</strong> 경우에만 환불을 검토합니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>결제 후 시스템 오류로 컷이 <strong>생성되지 않은</strong> 경우</li>
          <li>
            「이 컷 받기」·이메일 등 <strong>정상 전달이 객관적으로 반복 실패</strong>한 경우
          </li>
          <li>중복 결제·명백한 결제 오류</li>
        </ul>
        <p className="mt-2">
          위 사유라도 <strong>즉시 자동 환불되지 않습니다.</strong> 주문번호와 사유를 제출하시면
          운영자가 확인한 뒤 승인 시 환불합니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">5. 청약철회·환불이 어려운 경우</h2>
        <p className="mt-2">
          다음은 <strong>시스템 결함 미전달</strong>에 해당하지 않으며, 원칙적으로 청약철회·환불이
          어렵습니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>생성 성공</strong> 후 화면에 컷이 표시된 경우 (제공 개시)
          </li>
          <li>「이 컷 받기」·이메일 등으로 파일 전달·저장이 시작된 경우</li>
          <li>인화용 레이아웃 클린 PNG를 받은 경우</li>
          <li>
            “마음에 안 듦”, “안 닮음”, “보정 강도” 등 <strong>주관적 품질</strong> (→ 다시
            만들기·A/S)
          </li>
          <li>관공서·여권 등 <strong>공식 제출 반려</strong> (해당 용도 비보장)</li>
          <li>이용자가 직접 인화한 결과물의 매장 품질·규격 문제</li>
          <li>
            「이 컷 받기」를 누르지 않았다는 이유만으로 하는 <strong>단순 변심</strong>
          </li>
          <li>
            화면에 뜬 컷을 <strong>화면 저장·캡처·촬영</strong>한 뒤 「안 받았다」고 하는 경우
            (이미 제공이 시작된 상태로 봅니다)
          </li>
        </ul>
        <p className="mt-3 text-xs text-ink-500">
          결제 화면에서 위 기준(생성 성공 시 제공 개시 · 환불은 시스템 미전달만 · 품질은 A/S)에
          동의한 뒤에만 결제가 진행됩니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">6. 제공 개시의 정의</h2>
        <p className="mt-2">다음 중 하나라도 발생하면 콘텐츠가 제공된 것으로 봅니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            결제 후 <strong>컷 생성이 성공</strong>하여 화면에 표시된 경우
          </li>
          <li>「이 컷 받기」등 버튼으로 파일 전송이 시작된 경우</li>
          <li>워터마크 없는 원본이 단말에 저장 가능한 상태로 전달된 경우</li>
          <li>
            위 화면·파일을 OS·기기 <strong>화면 저장·캡처</strong> 또는 다른 기기로 촬영한 경우
          </li>
        </ul>
        <p className="mt-2 text-sm text-ink-600">
          정식 이용은 「이 컷 받기」로 PNG를 받아 주세요. 화면만 보신 뒤의 환불 요청은 「시스템
          결함 미전달」에 해당하지 않습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">7. 환불 신청 절차</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            주문번호와 함께 <strong>시스템 미전달·결제 오류 등 사유</strong>를 운영 채널·CS에 제출
          </li>
          <li>운영자 검토 (로그·재현 가능 여부를 확인합니다)</li>
          <li>
            <strong>승인 후에만</strong> PG 환불 처리 · 거절 시 사유를 안내
          </li>
        </ol>
        <p className="mt-2">
          생성이 이미 성공·제공된 주문은 시스템상 환불 접수가 거절될 수 있습니다. 정책을 반복해
          우회하려는 이용은 제한될 수 있습니다.
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
