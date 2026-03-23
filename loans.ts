import {test, Page, selectors} from '@playwright/test'
import ObjectsToCsv from 'objects-to-csv'
import {parse} from 'date-fns'
import {fr} from 'date-fns/locale'

async function nextLoan(page: Page) {
  const nextButton = page.locator('#navigation_next')
  if (await nextButton.isEnabled()) {
    await nextButton.click()
  }
}

const borrowerIds: Record<string,string> = {}
async function populateBorrowerIds(loans: any[], page: Page) {
  for (const url of loans.map(loan => loan.borrowerId))
  if (!borrowerIds[url]) {
    await page.goto(url)
    borrowerIds[url] = (await page.locator('#alias').allTextContents())[0].trim()
  }
}

function generateId(): string {
  const d1 = Array.from({length: 5}, () => Math.floor(Math.random() * 10)).join('');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d2 = Array.from({length: 4}, () => Math.floor(Math.random() * 10)).join('');
  return `L${d1}${letter}${d2}`;
}

test('Fetch Loans', async ({page}) => {
  try {
    selectors.setTestIdAttribute('data-resultindex')
    await page.goto(`/liberty/libraryHome.do`)
    await page.getByRole('button', {name: 'Login'}).click()
    await page.getByRole('textbox', {name: 'Username:'}).click()
    await page.getByRole('textbox', {name: 'Username:'}).fill(process.env.USERNAME!)
    await page.getByRole('textbox', {name: 'Password:'}).click()
    await page.getByRole('textbox', {name: 'Password:'}).fill(process.env.PASSWORD!)
    await page.getByRole('button', {name: 'Login'}).click()
    await page.goto(`http://${process.env.HOST}/liberty/circulation/loans/browse.do`)
    const navMsg = await page.locator('#navigation_message').allInnerTexts()
    const numLoans = Number(navMsg[0].split(' ')[2])
    console.log(numLoans)
    const loans: any[] = []
    for (let i = 0; i < 4; i++) {
      for (const row of await page
        .locator('#contentContainer')
        .locator('tbody')
        .locator('tr').all()) {
        const text = await row.locator('td').allInnerTexts()
        const checkoutDate = parse(text[3].split('\n')[0], `hh:mm a 'on' MMMM dd, yyyy`, new Date(), {locale: fr})
        const dueDate = parse(text[3].split('\n')[1], `hh:mm a 'on' MMMM dd, yyyy`, new Date(), {locale: fr})
        loans.push({
          id: generateId(),
          barcode: text[0],
          title: text[1],
          checkoutDate: checkoutDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          dueDate: dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          borrowerName: text[4],
          borrowerId: await row.locator('td').nth(4).locator('a').getAttribute('href'),
        })
      }
      await nextLoan(page)
    }
    console.log(`Writing ${loans.length} loans to CSV`)
    console.log(loans)
    await populateBorrowerIds(loans, page)
    const csv = new ObjectsToCsv(loans.map(loan => ({...loan, borrowerId: borrowerIds[loan.borrowerId]})))
    await csv.toDisk('loans.csv')

  } finally {
    await page.getByRole('button', {name: 'Logout'}).click()
  }
})
