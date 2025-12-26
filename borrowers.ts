import {test, Page} from '@playwright/test'
import ObjectsToCsv from 'objects-to-csv'

let borrowerNumber = 0

async function nextBorrower (page: Page) {
  await page.getByTitle(`Item ${++borrowerNumber}`).click()
}

test('Fetch Borrowers', async ({page}) => {
  try {
    await page.goto(`http://${process.env.HOST}/liberty/libraryHome.do`)
    await page.getByRole('button', {name: 'Login'}).click()
    await page.getByRole('textbox', {name: 'Username:'}).click()
    await page.getByRole('textbox', {name: 'Username:'}).fill(process.env.USERNAME!)
    await page.getByRole('textbox', {name: 'Password:'}).click()
    await page.getByRole('textbox', {name: 'Password:'}).fill(process.env.PASSWORD!)
    await page.getByRole('button', {name: 'Login'}).click()
    await page.goto(`http://${process.env.HOST}/liberty/circulation/borrowers/browse.do`)
    await page.locator('#navigation_message a').click()
    const navMsg = await page.locator('#navigation_message').allInnerTexts()
    console.log(navMsg[0].split(' ')[2])
    borrowerNumber = 1
    await page.getByRole('link', {name: `${borrowerNumber}`, exact: true}).click()
    const borrowers = []
    for (let i=0;i<50;i++) {
      // Print text from specific elements (e.g., all table cells)
      const cells = await page.locator('tr').allInnerTexts()
      borrowers.push(cells
        .filter(cell => cell.includes(':'))
        .map(cell => cell.split(':\t').map(part => part.trim()))
        .filter(row => row[1].length > 1)
        .reduce((acc, row) => {
          acc[row[0]] = row[1]
          return acc
        }, {} as Record<string, string>))
      await nextBorrower(page)
    }
    const csv = new ObjectsToCsv(borrowers.map(cell => ({
      id: cell.Alias,
      name: cell.Name,
      email: cell['Email address'],
      phone: cell.Mobile,
    })).filter(borrower => borrower.name))
    await csv.toDisk('borrowers.csv')

  } finally {
    await page.getByRole('button', {name: 'Logout'}).click()
  }
})
