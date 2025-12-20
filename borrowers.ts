import {test} from '@playwright/test';

let borrowerNumber = 0

async function nextBorrower (page: Page) {
  await page.getByTitle(`Item ${++borrowerNumber}`).click();
}

test('Fetch Borrowers', async ({page}) => {
  try {
    await page.goto(`http://${process.env.HOST}/liberty/libraryHome.do`);
    await page.getByRole('button', {name: 'Login'}).click();
    await page.getByRole('textbox', {name: 'Username:'}).click();
    await page.getByRole('textbox', {name: 'Username:'}).fill(process.env.USERNAME);
    await page.getByRole('textbox', {name: 'Password:'}).click();
    await page.getByRole('textbox', {name: 'Password:'}).fill(process.env.PASSWORD);
    await page.getByRole('button', {name: 'Login'}).click();
    await page.goto(`http://${process.env.HOST}/liberty/circulation/borrowers/browse.do`)
    await page.getByRole('link', {name: '1', exact: true}).click();
    borrowerNumber = 1
    await nextBorrower(page)
    await nextBorrower(page)
    await nextBorrower(page)
    await nextBorrower(page)

    // Print text from specific elements (e.g., all table cells)
    const cells = await page.locator('tr').allInnerTexts();
    console.log(cells
      .filter(cell => cell.includes(':'))
      .map(cell => cell.split(':\t').map(part => part.trim()))
      .filter(row => row[1].length > 1));
  } finally {
    await page.getByRole('button', {name: 'Logout'}).click();
  }
});
