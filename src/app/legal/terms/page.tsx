import LegalShell from "@/components/LegalShell";

export const metadata = {
  title: "이용약관 — 증명사진 -단정-",
};

export default function TermsPage() {
  return (
    <LegalShell title="이용약관">
      <section>
        <h2 className="text-base font-semibold text-ink-950">1. 서비스</h2>
        <p className="mt-2">
          증명사진 -단정-(이하 “서비스”, 서비스명 단정샷)은 이용자가 업로드한 셀카를 바탕으로 AI가 생성한{" "}
          <strong>디지털 이미지(PNG)</strong> 및 (선택) 인화용 타일 레이아웃 PNG를 제공합니다. 웹을
          통한 원샷 디지털 상품이며, 실물 사진의 제작·배송은 포함하지 않습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">2. 용도 제한</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>이력서·링크드인 등 <strong>민간 프로필·지원용</strong>을 주 용도로 합니다.</li>
          <li>
            여권·주민등록증·운전면허 등 <strong>관공서·신분증 제출을 보장하지 않습니다.</strong>{" "}
            해당 용도로 사용하여 반려·손해가 발생해도 서비스는 책임지지 않습니다.
          </li>
          <li>자동화·대량 생성·재판매·타인 사칭 목적의 이용을 금지합니다.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">3. 결제와 첫 컷</h2>
        <p className="mt-2">
          본 서비스는 <strong>결제 전 무료 미리보기(워터마크 포함)를 제공하지 않습니다</strong>.
          이용자는 용도·셀카·팩을 선택한 뒤 결제하고, 결제 완료 후 첫 컷 생성·열람이 가능합니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">4. 제공 개시 · 다운로드 · 화면 캡처</h2>
        <p className="mt-2">
          결제 후 생성된 컷이 화면에 표시되거나, 클린 PNG를 다운로드(저장)하면{" "}
          <strong>디지털콘텐츠 제공이 개시</strong>된 것으로 봅니다. 화면 캡처·촬영으로 이미지를
          확보한 뒤 「다운로드하지 않았다」고 환불을 청구하는 행위는 금지되며, 환불 거절·이용 제한
          사유가 될 수 있습니다. 상세는 「환불·청약철회」 정책을 따릅니다. 결제 후 다시 만들기·A/S
          기회를 정책 범위에서 제공할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">5. 인화</h2>
        <p className="mt-2">
          실물 배송은 하지 않습니다. 인화용 레이아웃 PNG를 받아{" "}
          <strong>프린팅박스 등 포토 키오스크·인화 서비스</strong>에서 이용자가 직접 출력할 수
          있습니다. 안내는 사이트{" "}
          <a href="/print" className="underline">
            사진인화안내(/print)
          </a>
          를 참고하세요. 인화 비용·품질·기기 장애는 해당 매장·서비스의 책임 영역입니다. 특정
          키오스크와의 전용 연동은 현재
          제공하지 않습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">6. 사진 처리</h2>
        <p className="mt-2">
          원본·결과물을 서버에 상시 보관하지 않는 것을 원칙으로 합니다. 생성 처리에 필요한 범위에서
          일시적으로 이미지가 처리될 수 있으며, 상세는 개인정보 안내를 따릅니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">7. 면책</h2>
        <p className="mt-2">
          AI 생성 결과는 입력 사진·모델 특성에 따라 달라질 수 있으며, “본인과 완전히 동일”을
          보장하지 않습니다. 결제·다운로드한 결과에 대한 주관적 불만족은 환불 사유가 되지 않으며,
          정책상 재생성 기회를 제공할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">8. 문의</h2>
        <p className="mt-2">
          서비스 관련 문의는 운영 채널(추후 고지)로 연락해 주세요. 약관과 환불 정책이 충돌하면{" "}
          <strong>환불·청약철회 페이지</strong>의 구체 규정이 우선합니다.
        </p>
      </section>
    </LegalShell>
  );
}
