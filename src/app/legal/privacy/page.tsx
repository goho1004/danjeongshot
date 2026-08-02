import LegalShell from "@/components/LegalShell";

export const metadata = {
  title: "개인정보 안내 — 증명사진 -단정-",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="개인정보 안내">
      <section>
        <h2 className="text-base font-semibold text-ink-950">1. 수집·이용</h2>
        <p className="mt-2">
          서비스 제공을 위해 업로드 이미지(셀카), 선택한 용도, 결제·주문 식별 정보, 접속 로그(IP
          등 보안·한도용)가 처리될 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">2. 보관 원칙</h2>
        <p className="mt-2">
          <strong>원본·결과 이미지를 서버에 상시 저장하지 않는 것</strong>을 원칙으로 합니다. 생성
          처리 중 일시적으로 이미지가 메모리·모델 API로 전달될 수 있으며, 처리 목적 달성 후 보관하지
          않습니다. 이용자가 요청한 <strong>이메일 전달</strong>은 발송 목적의 단기 처리이며, 서버에
          결과물을 상시 보관하지 않습니다. (결제·환불 분쟁용으로 주문 메타데이터·다운로드·이메일
          발송 시각 등은 보관할 수 있습니다.)
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">3. 제3자</h2>
        <p className="mt-2">
          이미지 생성에 Google Gemini 등 외부 AI API가 사용될 수 있습니다. 결제 시 결제대행사가
          연결될 수 있습니다. 이메일 전달 시 발송 대행(예: Resend)이 사용될 수 있습니다. 각
          사업자의 처리방침이 적용됩니다. 인화는 프린팅박스 등 외부 키오스크 서비스로, 단정샷이
          운영하지 않습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">4. 문의</h2>
        <p className="mt-2">개인정보 관련 문의는 운영 채널(추후 고지)로 연락해 주세요.</p>
      </section>
    </LegalShell>
  );
}
