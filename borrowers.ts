import {test, Page} from '@playwright/test'
import ObjectsToCsv from 'objects-to-csv'
import { parse } from 'date-fns'
import { fr } from 'date-fns/locale'

let borrowerNumber = 0

async function nextBorrower (page: Page) {
  const nextButton = page.getByTitle(`Item ${(++borrowerNumber).toLocaleString()}`)
  if (await nextButton.isEnabled()) {
    await nextButton.click()
  }
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
    const numBorrowers = Number(navMsg[0].split(' ')[2])
    console.log(numBorrowers)
    borrowerNumber = 1
    await page.getByRole('link', {name: `${borrowerNumber}`, exact: true}).click()
    const borrowers = []
    for (let i=0;i<numBorrowers;i++) {
      if (borrowerNumber % 100 == 0) {
        console.log(`Processing borrower ${borrowerNumber}`)
      }
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
    console.log(`Writing ${borrowers.length} borrowers to CSV`)
    const csv = new ObjectsToCsv(borrowers.map(cell => ({
      id: cell.Alias,
      name: cell.Name,
      email: cell['Email address'],
      phone: cell.Mobile,
      gender: cell.Gender,
      address: cell.Address,
      postcode: cell.Postcode,
      status: cell['Expiry date'] ? parse(cell['Expiry date'], 'MMMM dd, yyyy', new Date(), { locale: fr }) > new Date() ? 'active' : 'inactive' : null
    })).filter(borrower => borrower.name))
    await csv.toDisk('borrowers.csv')

  } finally {
    await page.getByRole('button', {name: 'Logout'}).click()
  }
})
