import {test, Page, selectors} from '@playwright/test'
import ObjectsToCsv from 'objects-to-csv'
import { parse } from 'date-fns'
import { fr } from 'date-fns/locale'

async function nextLoan (page: Page) {
  const nextButton = page.locator('#navigation_next')
  if (await nextButton.isEnabled()) {
    await nextButton.click()
  }
}

test('Fetch Loans', async ({page}) => {
  try {
    selectors.setTestIdAttribute('data-resultindex')
    await page.goto(`http://${process.env.HOST}/liberty/libraryHome.do`)
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
    for (let i=0;i<4;i++) {
      for (const row of await page
        .locator('#contentContainer')
        .locator('tbody')
        .locator('tr').all()) {
        const text = await row.locator('td').allInnerTexts()
        loans.push({
          barcode: text[0],
          title: text[1],
          checkout: text[3].split('\n')[0],
          due: text[3].split('\n')[1],
          borrowerName: text[4],
          borrowerId: await row.locator('td').nth(4).locator('a').getAttribute('href'),
          status: parse(text[3].split('\n')[1], `hh:mm a 'on' MMMM dd, yyyy`, new Date(), { locale: fr }) > new Date() ? 'out' : 'overdue'
        })
      }
      await nextLoan(page)
    }
    console.log(`Writing ${loans.length} loans to CSV`)
    console.log(loans)
    const csv = new ObjectsToCsv(loans)
    await csv.toDisk('loans.csv')

  } finally {
    await page.getByRole('button', {name: 'Logout'}).click()
  }
})
