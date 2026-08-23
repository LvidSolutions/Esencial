const headingSv = document.querySelector('#heading-sv')
const headingEn = document.querySelector('#heading-en')
const pairSelect = document.querySelector('#project-pair')
const draftStatus = document.querySelector('[data-testid="draft-status"]')
const saveButton = document.querySelector('[data-action="save"]')
const resetHeadingsButton = document.querySelector('[data-action="reset-headings"]')
const openValidationButton = document.querySelector('[data-action="open-validation"]')

function updateDraftState() {
  const dirty =
    headingSv.value !== headingSv.defaultValue || headingEn.value !== headingEn.defaultValue
  pairSelect.disabled = dirty
  openValidationButton.disabled = dirty
  saveButton.disabled = !headingSv.value.trim() || !headingEn.value.trim()
  draftStatus.textContent = dirty
    ? 'Osparade rubrikändringar finns. Spara eller återställ innan du byter projektpar.'
    : 'Inga osparade formulärändringar.'
}

headingSv.addEventListener('input', updateDraftState)
headingEn.addEventListener('input', updateDraftState)
saveButton.addEventListener('click', () => {
  draftStatus.textContent = 'Sparar kladd…'
  headingSv.defaultValue = headingSv.value
  headingEn.defaultValue = headingEn.value
  updateDraftState()
  document.querySelector('[data-testid="workspace-status"]').textContent =
    'Senaste läsning eller sparning är klar'
})
resetHeadingsButton.addEventListener('click', () => {
  headingSv.value = headingSv.defaultValue
  headingEn.value = headingEn.defaultValue
  updateDraftState()
})

const filterSelect = document.querySelector('#filter-category')
const filterSv = document.querySelector('#filter-sv')
const filterEn = document.querySelector('#filter-en')
const filterMember = document.querySelector('#filter-member')
const filterSave = document.querySelector('[data-action="save-filter"]')
const filterOpen = document.querySelector('[data-action="open-filter-validation"]')
const filterStatus = document.querySelector('[data-testid="filter-status"]')

function updateFilterState() {
  const dirty =
    filterSv.value !== filterSv.defaultValue ||
    filterEn.value !== filterEn.defaultValue ||
    filterMember.checked !== filterMember.defaultChecked
  filterSelect.disabled = dirty
  filterOpen.disabled = dirty
  filterSave.disabled = !filterSv.value.trim() || !filterEn.value.trim() || !filterMember.checked
  filterStatus.textContent = dirty
    ? 'Osparade filterändringar finns. Spara eller återställ innan du byter kategori.'
    : 'Inga osparade filterändringar.'
}

filterSv.addEventListener('input', updateFilterState)
filterEn.addEventListener('input', updateFilterState)
filterMember.addEventListener('change', updateFilterState)
document.querySelector('[data-action="reset-filter"]').addEventListener('click', () => {
  filterSv.value = filterSv.defaultValue
  filterEn.value = filterEn.defaultValue
  filterMember.checked = filterMember.defaultChecked
  updateFilterState()
})

document.querySelector('[data-testid="order-list"]').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-move]')
  if (!button) return
  const row = button.closest('[data-project]')
  const sibling = button.dataset.move === 'up' ? row.previousElementSibling : row.nextElementSibling
  if (!sibling) return
  if (button.dataset.move === 'up') row.parentElement.insertBefore(row, sibling)
  else row.parentElement.insertBefore(sibling, row)
  document.querySelector('[data-testid="order-status"]').textContent =
    'Rutnätet har osparade ändringar. Den publicerade webbplatsen är oförändrad.'
})

const stateMessages = {
  loading: 'Laddar: vänta medan verklig data hämtas.',
  saved: 'Sparad: senaste kladdsparningen är klar.',
  error: 'Fel: ingen publicerad version ändrades. Kontrollera anslutningen och försök igen.',
  blocked: 'Blockerad: skyddad staging eller ägargodkännande saknas.',
  unavailable: 'Inte tillgänglig: ingen godkänd leverantör är ansluten.',
}

const originalOrder = ['A', 'B']
document.querySelector('[data-action="reset-order"]').addEventListener('click', () => {
  const list = document.querySelector('[data-testid="order-list"]')
  for (const project of originalOrder) list.append(document.querySelector(`[data-project="${project}"]`))
  document.querySelector('[data-testid="order-status"]').textContent =
    'Rutnätsordningen är återställd till senast laddade värden.'
})

document.querySelector('.fixture-state-actions').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-state-action]')
  if (!button) return
  document.querySelector('[data-testid="state-message"]').textContent =
    stateMessages[button.dataset.stateAction]
})
