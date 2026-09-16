import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { PACKS, POSITIONING, PRICE, PURPOSES } from "@/lib/purposes";
import GalleryView from "@/components/GalleryView";
import HeroWithSlider from "@/components/HeroWithSlider";
import SiteFooter from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ink-100/60 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="focus-ring flex items-center gap-2 font-display text-xl tracking-brand text-ink-950 transition hover:text-studio md:text-2xl"
          >
            {BRAND.sign}
            <span className="rounded-full bg-studio/10 px-2 py-0.5 font-sans text-[10px] font-semibold tracking-wide text-studio-deep">
              {BRAND.beta}
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-500 md:flex">
            <a href="#gallery" className="focus-ring rounded hover:text-ink-900">
              갤러리
            </a>
            <a href="#deliverables" className="focus-ring rounded hover:text-ink-900">
              받는 것
            </a>
            <a href="#price" className="focus-ring rounded hover:text-ink-900">
              가격
            </a>
            <a href="#how" className="focus-ring rounded hover:text-ink-900">
              이용 방법
            </a>
            <a href="#kiosk" className="focus-ring rounded hover:text-ink-900">
              인화
            </a>
          </nav>
          <Link
            href="/make"
            className="focus-ring rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-studio"
          >
            만들기
          </Link>
        </div>
      </header>

      <main>
        <HeroWithSlider />

        <section id="gallery" className="border-t border-ink-100 bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <p className="text-xs font-semibold tracking-wide text-studio">전 · 후</p>
            <h2 className="mt-3 font-display text-3xl text-ink-950 md:text-5xl">갤러리</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-500">
              슬라이더를 밀어 셀카와 단정 프사를 비교하세요. 과한 미모 보정·네컷 감성은 아닙니다.
            </p>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-400">
              아래는 구성·톤 예시입니다. 실제 결과물은 업로드한 셀카와 선택한 용도에 따라 달라집니다.
              여권·관공서 제출용은 아닙니다.
            </p>
            <div className="mt-10">
              <GalleryView />
            </div>
          </div>
        </section>

        <section id="deliverables" className="border-t border-ink-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
            <p className="text-xs font-semibold tracking-wide text-studio">결제 후</p>
            <h2 className="mt-3 font-display text-3xl text-ink-950 md:text-5xl">받는 것</h2>
            <p className="mt-4 max-w-xl text-ink-500 leading-relaxed">
              {POSITIONING.vsCrowd} 기본은 단정 PNG, 플러스는 자주 쓰는 인화 규격까지입니다.
            </p>

            <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
              <article className="group">
                <div className="relative overflow-hidden rounded-sm bg-ink-50 shadow-soft">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink-700 backdrop-blur">
                    01 · 단정 PNG
                  </div>
                  <div className="flex aspect-[3/4] max-h-[420px] items-center justify-center bg-gradient-to-b from-ink-100 to-paper-deep">
                    <div className="relative h-[78%] w-[58%] overflow-hidden rounded-sm bg-white shadow-lift ring-1 ring-ink-100 transition duration-500 group-hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-studio-mist via-white to-ink-50" />
                      <div className="absolute inset-x-0 bottom-0 bg-ink-950/80 px-3 py-2 text-center text-[10px] font-medium text-white">
                        PNG · 고해상 · 이력서·링크드인
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="mt-6 font-display text-2xl text-ink-950">단정 PNG</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  팩을 고르고 결제한 뒤 첫 컷을 만듭니다. 워터마크 없는 PNG 한 장을 받습니다.
                  사람인·잡코리아·링크드인에 바로 올릴 수 있어요.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink-500">
                  <li>· 과한 보정 없이, 나처럼 보이는 단정함을 우선합니다</li>
                  <li>· 용도에 맞춰 배경·옷차림만 조용히 정리합니다</li>
                  <li>· 올린 사진·결과물은 서버에 오래 두지 않습니다</li>
                </ul>
              </article>

              <article className="group">
                <div className="relative overflow-hidden rounded-sm bg-ink-50 shadow-soft">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink-700 backdrop-blur">
                    02 · 인화용 레이아웃
                  </div>
                  <div className="flex aspect-[3/4] max-h-[420px] items-center justify-center bg-gradient-to-b from-studio-mist to-paper-deep p-8">
                    <div className="relative aspect-[2/3] w-[55%] max-w-[200px] bg-white p-2 shadow-lift ring-1 ring-ink-100 transition duration-500 group-hover:-translate-y-1">
                      <div className="grid h-full grid-cols-3 grid-rows-4 gap-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="bg-gradient-to-b from-ink-100 to-studio-soft/40"
                          />
                        ))}
                      </div>
                      <p className="absolute -bottom-7 left-0 right-0 text-center text-[10px] text-ink-400">
                        4×6 · 타일 PNG 예시
                      </p>
                    </div>
                  </div>
                </div>
                <h3 className="mt-6 font-display text-2xl text-ink-950">인화용 레이아웃</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  플러스팩에 반명함·증명 규격이 포함됩니다. 기본팩은 PNG만 받고, 필요할 때 규격별로
                  추가할 수 있어요. 배송은 없고, 키오스크에서 직접 인화합니다.
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink-500">
                  <li>· 플러스: 반명함·증명 타일 PNG</li>
                  <li>· 기본: 받은 뒤 첫 규격 1종 무료, 이후 개별·패키지</li>
                  <li>· 인화비는 매장 요금 · {POSITIONING.notFor}</li>
                </ul>
              </article>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-ink-100 pt-8">
              <p className="text-sm text-ink-500">
                한 장이면 기본, 서류·키오스크까지면 플러스예요.
              </p>
              <Link
                href="/make"
                className="focus-ring text-sm font-semibold text-studio hover:underline"
              >
                용도 고르고 만들기 →
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-ink-100 bg-ink-950 text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
            <h2 className="max-w-2xl font-display text-3xl leading-snug md:text-4xl">
              자정 마감인데,
              <br />
              <span className="italic text-studio-soft">사진관은 이미 닫았다.</span>
            </h2>
            <p className="mt-6 max-w-lg text-ink-300 leading-relaxed">
              정장이 없고, 셀카는 어딘가 어색할 때. {BRAND.sign}은 배경·옷·조명만 정리합니다. 다른
              사람으로 바꾸지는 않아요.
            </p>
          </div>
        </section>

        <section id="how" className="bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
            <p className="text-xs font-semibold tracking-wide text-studio">변환</p>
            <h2 className="mt-2 font-display text-3xl text-ink-950 md:text-4xl">
              예뻐지는 게 아니라 단정해집니다
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500">
              얼굴은 그대로. 배경·조명·구도만 정돈합니다. 뷰티 필터는 기본 OFF.
            </p>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "01",
                  t: "업로드",
                  d: "정면·밝은 셀카. O/X 가이드로 입력 품질을 먼저 고정합니다.",
                },
                {
                  n: "02",
                  t: "배경",
                  d: "흰/연회색으로 단정하게. 잡배경을 정리합니다.",
                },
                {
                  n: "03",
                  t: "조명·구도",
                  d: "그림자를 고르게, 상반신 증명 구도로 맞춥니다.",
                },
                {
                  n: "04",
                  t: "얼굴 보존",
                  d: "과보정 OFF. 나처럼 보이게 유지한 뒤 PNG로 받습니다.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 text-sm font-semibold text-white">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink-950">{step.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.d}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-xs text-ink-400">
              이용 흐름: 용도 선택 → 셀카 → 팩 결제 → 첫 컷·다운로드. 받은 뒤 환불은 어렵습니다.
            </p>
          </div>
        </section>

        <section className="border-t border-ink-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
            <h2 className="font-display text-3xl text-ink-950 md:text-4xl">어디에 쓸지</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-sm bg-ink-100 md:grid-cols-3">
              {PURPOSES.map((p) => (
                <Link
                  key={p.id}
                  href={`/make?purpose=${p.id}`}
                  className="focus-ring group bg-white p-8 transition hover:bg-studio-mist"
                >
                  <h3 className="font-display text-xl text-ink-950 group-hover:text-studio-deep">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-500 leading-relaxed">{p.blurb}</p>
                  <span className="mt-6 inline-block text-sm font-semibold text-studio">
                    {p.cta} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="price" className="bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
            <p className="text-xs font-semibold tracking-wide text-studio">가격</p>
            <h2 className="mt-2 font-display text-3xl text-ink-950 md:text-4xl">
              기본과 플러스, 두 가지
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500">
              후보 사진을 잔뜩 고르는 구성이 아닙니다. 미리 보고, 한 장을 받습니다. 인화가 필요하면
              플러스를 고르세요.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {PACKS.map((p) => (
                <article
                  key={p.id}
                  className={`rounded-sm border bg-white p-8 ${
                    p.recommended ? "border-studio/40 shadow-soft" : "border-ink-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-2xl text-ink-950">{p.name}</h3>
                    {p.recommended && (
                      <span className="rounded-full bg-ink-950 px-3 py-1 text-[11px] font-semibold text-white">
                        인화까지
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-ink-950">
                    ₩{p.priceKrw.toLocaleString("ko-KR")}
                  </p>
                  <p className="mt-2 text-sm text-ink-500">{p.tagline}</p>
                  <ul className="mt-6 space-y-2 text-sm text-ink-600">
                    {p.bullets.map((b) => (
                      <li key={b}>· {b}</li>
                    ))}
                  </ul>
                  <Link
                    href="/make"
                    className={`focus-ring mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                      p.recommended
                        ? "bg-studio text-white hover:bg-studio-deep"
                        : "bg-ink-950 text-white hover:bg-studio"
                    }`}
                  >
                    {p.name}으로 만들기
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-8 text-xs leading-relaxed text-ink-400">
              추가 컷 ₩{PRICE.extraShotKrw.toLocaleString("ko-KR")} · 추가 인화 규격 ₩
              {PRICE.extraLayoutKrw.toLocaleString("ko-KR")} · 전 규격 ₩
              {PRICE.layoutPackKrw.toLocaleString("ko-KR")} · {POSITIONING.notFor}
            </p>
          </div>
        </section>

        <section id="shoot-guide" className="border-t border-ink-100 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
            <h2 className="font-display text-3xl text-ink-950">셀카, 이렇게만</h2>
            <p className="mt-2 text-sm text-ink-500">
              결과가 가장 많이 갈리는 부분이에요. (원일 촬영 가이드 · 단정 톤)
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="border-l-2 border-studio bg-studio-mist/50 px-6 py-5">
                <p className="text-sm font-semibold text-studio-deep">잘 나오는 컷 · O</p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
                  <li>정면을 보고 · 시선은 카메라</li>
                  <li>창가처럼 밝은 곳 (어두우면 먼저 이동)</li>
                  <li>얼굴을 원 안에 · 어깨까지</li>
                  <li>안경 반사가 적을 때</li>
                </ul>
              </div>
              <div className="border-l-2 border-ink-200 bg-ink-50/80 px-6 py-5">
                <p className="text-sm font-semibold text-ink-500">피해주세요 · X</p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
                  <li>옆모습·아래에서 올린 셀카</li>
                  <li>단체 사진에서 얼굴만 자른 것</li>
                  <li>필터·뷰티 모드가 강한 것</li>
                  <li>비슷한 각도만 반복하는 것</li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-xs text-ink-400">
              만들기 화면에도 같은 원형 가이드가 있어요.{" "}
              <Link href="/make" className="font-medium text-studio underline-offset-2 hover:underline">
                /make 에서 바로 맞추기 →
              </Link>
            </p>
          </div>
        </section>

        <section id="kiosk" className="bg-ink-950 text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-studio-soft">
              사진인화안내
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">
              종이로 낼 때 · 프린팅박스
            </h2>
            <p className="mt-4 max-w-xl text-ink-300 leading-relaxed">
              택배 배송은 없어요. 인화용 레이아웃 PNG를{" "}
              <span className="text-white font-medium">프린팅박스</span>에 올려 근처 기기에서
              뽑으세요.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="https://printingbox.kr/store"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex rounded-full bg-studio-soft px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-white"
              >
                프린팅박스 위치 찾기 →
              </a>
              <a
                href="https://printingbox.kr/"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-950 hover:bg-studio-soft"
              >
                프린팅박스 쿠폰·이벤트 →
              </a>
              <Link
                href="/print"
                className="focus-ring inline-flex rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white"
              >
                사진인화안내 자세히 →
              </Link>
              <Link
                href="/make?purpose=sheet"
                className="focus-ring inline-flex items-center px-2 text-sm font-medium text-ink-400 hover:text-white"
              >
                인화용으로 시작 →
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink-500">
              폰에서 파일을 못 찾으면 만들기에서 「이메일로 받기」를 쓰세요.
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-studio-soft">집에서</p>
                <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-ink-300">
                  <li>단정 PNG 저장</li>
                  <li>플러스면 반명함·증명 레이아웃 받기 (기본은 필요 시 추가)</li>
                  <li>타일 확인 후 폰 앨범에 담기</li>
                </ol>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-studio-soft">
                  프린팅박스
                </p>
                <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-ink-300">
                  <li>앱·웹에서 사진 인화 · 용지 4×6</li>
                  <li>레이아웃 PNG 업로드 → 인쇄코드</li>
                  <li>근처 기기에 코드 입력 · 결제 · 출력</li>
                  <li>인화비는 매장 · 관공서 제출용은 아닙니다</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
            <h2 className="font-display text-3xl text-ink-950">자주 묻는 말</h2>
            <dl className="mt-10 divide-y divide-ink-100">
              {[
                {
                  q: "기본이랑 플러스 차이가 뭐예요?",
                  a: "둘 다 결제 후 1컷을 만듭니다. 기본(₩9,900)은 단정 PNG와 다시 만들기·A/S입니다. 플러스(₩14,900)는 여기에 반명함·증명 인화 레이아웃이 포함됩니다.",
                },
                {
                  q: "단정 PNG랑 인화용 레이아웃 차이가 뭐예요?",
                  a: "단정 PNG는 이력서·링크드인에 올리는 한 장이에요. 인화용 레이아웃은 그 사진을 4×6에 여러 장 깐 파일로, 키오스크에서 뽑을 때 씁니다.",
                },
                {
                  q: "AI 사진이라 탈락할까요?",
                  a: "AI를 금지한 공고라면 스튜디오를 쓰세요. 민간·급함·링크드인에는 ‘나처럼 단정한’ 수준이 맞는 경우가 많아요. 과한 보정은 기본으로 켜지 않습니다.",
                },
                {
                  q: "여권·주민증에 쓸 수 있나요?",
                  a: "아니요. 관공서 제출용으로 만들지 않았어요.",
                },
                {
                  q: "사진은 보관하나요?",
                  a: "아니요. 올린 셀카와 만든 사진 모두 서버에 저장하지 않습니다. 결과는 브라우저로 바로 받아요.",
                },
                {
                  q: "마음에 안 들면요?",
                  a: "결제 후 다시 만들기와 A/S를 한 번씩 쓸 수 있어요. 다운로드한 뒤에는 환불이 어렵습니다.",
                },
              ].map((item) => (
                <div key={item.q} className="py-6">
                  <dt className="font-semibold text-ink-900">{item.q}</dt>
                  <dd className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="hero-wash relative border-t border-ink-100">
          <div className="grain" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-5 py-24 text-center md:px-8 md:py-32">
            <p className="font-display text-4xl text-ink-950 md:text-5xl">자정 전에, 한 장.</p>
            <Link
              href="/make"
              className="focus-ring mt-8 inline-flex rounded-full bg-ink-950 px-8 py-4 text-base font-semibold text-white transition hover:bg-studio"
            >
              용도 고르고 만들기
            </Link>
            <p className="mt-5 text-xs text-ink-400">
              여권·관공서용 아님 · 받은 뒤 환불 어려움 · 사진 미저장
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
