# T1006 - Backend Form Semantics + Credential Affordance Hardening

## Spec

### 문제

- backend admin token / API base / client credentials form field가 input metadata 측면에서 거칠다.
- `clientId`가 password처럼 다뤄지고, non-auth field도 password manager를 부를 수 있어 operator reviewability가 떨어진다.

### 목표

- backend settings form을 operator-friendly form semantics로 정리한다.
- input metadata, helper copy, credential affordance를 현재 가이드라인에 맞춘다.

### 범위

- 포함:
  - `name`, `autocomplete`, 적절한 `type` 정렬
  - `clientId` / `clientSecret` visibility and helper copy 분리
  - placeholder / example pattern 정리
  - inline validation/focus affordance 점검
- 제외:
  - 비밀정보 암호화 저장 구현
  - backend binding inspector 재설계

### 해결방안

- non-auth field는 `autocomplete="off"`와 명확한 `name`을 준다.
- `clientId`는 review 가능한 일반 텍스트 field로 다루고, `clientSecret`/admin token만 secret affordance를 유지한다.
- overwrite semantics와 saved credential state를 helper copy로 분리한다.

### 상세 설계

#### A. Field Classification

- auth / secret fields
  - backend admin token
  - client secret
- non-secret fields
  - admin API base URL
  - backend preset API base URL
  - client ID
  - preset name / description

#### B. Input Metadata Contract

- 모든 field는 explicit `name`을 가진다.
- non-auth field는 password manager misfire를 막기 위해 `autocomplete="off"`를 기본으로 둔다.
- auth field는 browser autofill semantics를 신중히 택하되, operator intent를 해치지 않는 값을 사용한다.
- URL field는 `type="url"`과 예시 placeholder를 사용한다.

#### C. Credential Affordance

- `clientId`
  - mask하지 않는다
  - copy/review 가능한 일반 텍스트 affordance
- `clientSecret` / admin token
  - masked by default
  - helper copy로 stored value overwrite semantics 명시
  - reveal affordance는 선택 사항이지만, reviewability가 필요하면 별도 CTA로 추가 검토

#### D. Validation / Helper Copy

- helper copy는 다음을 분리해 설명한다.
  - required 여부
  - stored value overwrite semantics
  - 해당 field가 live server apply에 미치는 영향
- invalid input은 inline error + first actionable fix를 제공한다.

#### E. Safe Default

- metadata 부재로 password manager가 잘못 채우는 상황을 기본적으로 피한다.
- secret storage 자체는 이번 task의 범위 밖이므로 UI semantics만 정리한다.

### 수용 기준 (AC)

- [ ] backend 관련 input이 적절한 `name`/`autocomplete`/`type`을 가진다.
- [ ] `clientId`와 `clientSecret`의 affordance가 분리된다.
- [ ] password manager misfire 가능성을 줄이는 safe default가 적용된다.
- [ ] validation/helper copy가 field semantics와 맞는다.

## Plan (Review 대상)

1. field를 auth/non-auth/url/general로 분류한다.
2. 각 분류별 metadata(`name`, `autocomplete`, `type`) 기준을 고정한다.
3. `clientId` / `clientSecret` / admin token affordance 차이를 정리한다.
4. helper copy와 inline validation 책임을 분리한다.
5. browser/password-manager misfire safe default를 verify 항목까지 연결한다.

## Review Checklist (Plan Review)

- [x] non-auth field가 password manager를 부르지 않도록 설계됐는가?
- [x] `clientId`가 불필요하게 숨겨지지 않는가?
- [x] helper copy가 overwrite/save semantics를 정확히 설명하는가?
- [x] URL/secret/general field metadata 차이가 분명한가?

## Self Review 1 - Scope Fit

- [x] medium-severity review finding이라 P2가 적절하다.
- [x] form semantics만 다루도록 범위를 좁혔다.

## Self Review 2 - Safety / Clarity

- [x] auth field와 non-auth field를 분리해 password-manager misfire 문제를 직접 겨냥했다.
- [x] `clientId` reviewability와 secret field masking을 동시에 보존하는 쪽으로 정리했다.
- [x] secret storage 자체 구현은 제외해 task를 불필요하게 키우지 않았다.

## Self Review 3 - Executability

- [x] field classification -> metadata -> helper copy -> validation 순서로 바로 구현 가능하다.
- [x] 현재 `SettingsPage` input 집합에 그대로 대응되는 설계다.
- [x] verify 항목이 form-focused page test와 lint/build gate로 충분하다.

## Implementation Log

- [ ] field metadata와 helper copy를 정리한다.
- [ ] `clientId`/`clientSecret` affordance를 분리한다.
- [ ] URL field type/placeholder example을 정리한다.
- [ ] validation/focus behavior를 필요한 범위만 갱신한다.

## Review Checklist (Implementation Review)

- [ ] browser/password-manager autofill이 operator flow를 방해하지 않는가?
- [ ] `clientId` reviewability와 `clientSecret` secrecy가 동시에 유지되는가?
- [ ] field semantics가 i18n helper copy와 일치하는가?

## Verify

- [ ] `npm --prefix webapp run test -- SettingsPage`
- [ ] `npm --prefix webapp run lint`
- [ ] `npm --prefix webapp run build`
