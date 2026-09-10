import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'chrome', headless:true});
const errors=[];
try {
for (const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/','/catalogo/','/nosotros/','/contacto/','/preguntas-frecuentes/','/terminos-y-condiciones/','/libro-de-reclamaciones/']) {
  await page.goto('http://127.0.0.1:4173'+path);
  await page.waitForTimeout(600);
  console.log(width,path,await page.locator('h1').count(), 'overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 }
 await page.goto('http://127.0.0.1:4173/catalogo/');
 await page.locator('.catalog-cart-button').first().click();
 await page.locator('#cart-delivery-zone-trigger').click();
 await page.locator('[data-zone="zone2"]').click();
 console.log('cart',width,await page.locator('#cart-delivery-price').innerText(),await page.locator('#cart-delivery-zone-trigger').getAttribute('aria-expanded'));
 await page.close();
}
console.log('JS errors:',errors);
if(errors.length)process.exitCode=1;
} finally {await browser.close();}
