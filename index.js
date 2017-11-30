const chalk = require('chalk');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const CREDS = require('./creds');
const User = require('./models/user');

// login page variables
const USERNAME_SELECTOR = '#login_field';
const PASSWORD_SELECTOR = '#password';
const BUTTON_SELECTOR = '#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block';

// serach page variables
const USER_TO_SEARCH = 'megan';
const SEARCH_URL = 'https://github.com/search?q=' + USER_TO_SEARCH + '&l=JavaScript&type=Users&utf8=%E2%9C%93';
const USER_LIST_INFO_SELECTOR = '.user-list-item';
const USER_LIST_USERNAME_SELECTOR = '.user-list-info>a:nth-child(1)';
const USER_LIST_EMAIL_SELECTOR = '.user-list-info>.user-list-meta .muted-link';


async function getNumPages(page) {
    const NUM_USER_SELECTOR = '#js-pjax-container > div.container > div > div.column.three-fourths.codesearch-results.pr-6 > div.d-flex.flex-justify-between.border-bottom.pb-3 > h3';

    let inner = await page.evaluate((sel) => {
        return document.querySelector(sel).innerHTML;
    }, NUM_USER_SELECTOR);

    // 格式是: "69,803 users"
    inner = inner.replace(',', '').replace(' users', '');
    const numUsers = parseInt(inner);
    console.log(chalk.cyan(`>> Total number of users is ${numUsers}`));

    // 每页默认显示 10 个结果
    const numPages = Math.ceil(numUsers / 10);
    return numPages;
}


function upsertUser(userObj) {
    const DB_URL = 'mongodb://localhost/thal';
    if (mongoose.connection.readyState == 0) {
        mongoose.connect(DB_URL, {
            useMongoClient: true,
        });
    }

    // if this email exists, update the entry, don't insert
    // 如果邮箱存在，就更新实例，不新增
    const conditions = {
        email: userObj.email
    };
    const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
    };

    User.findOneAndUpdate(conditions, userObj, options, (err, result) => {
        if (err) {
            throw err;
        }
    });
}


async function main() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log(chalk.yellow('============== START =============='));

    // open login page
    await page.goto('https://github.com/login');
    console.log(chalk.cyan('>> success init login page'));

    // enter userinfo
    await page.type(PASSWORD_SELECTOR, CREDS.password);
    await page.type(USERNAME_SELECTOR, CREDS.username);
    await page.click(BUTTON_SELECTOR);
    await page.waitForNavigation();
    console.log(chalk.cyan('>> success login'));

    // open search page
    await page.goto(SEARCH_URL);
    await page.waitFor(2 * 1000);
    console.log(chalk.cyan('>> success go to search page'));


    // get filter search result
    const numPages = await getNumPages(page);
    console.log(chalk.cyan(`>> Total number of pages is ${numPages}`));

    for (let h = 1; h <= numPages; h++) {
        // 跳转到指定页码
        await page.goto(`${SEARCH_URL}&p=${h}`);
        // 执行爬取
        const users = await page.evaluate((sInfo, sName, sEmail) => {
            return Array.prototype.slice.apply(document.querySelectorAll(sInfo))
                .map($userListItem => {
                    // 用户名
                    const username = $userListItem.querySelector(sName).innerText;
                    // 邮箱
                    const $email = $userListItem.querySelector(sEmail);
                    const email = $email ? $email.innerText : undefined;
                    return {
                        username,
                        email,
                    };
                })
                // 不是所有用户都显示邮箱
                .filter(u => !!u.email);
        }, USER_LIST_INFO_SELECTOR, USER_LIST_USERNAME_SELECTOR, USER_LIST_EMAIL_SELECTOR);

        users.map(({
            username,
            email
        }) => {
            console.log(`PageNo.${h}: ` + chalk.green(`${username} -> ${email}`));
            upsertUser({
                username: username,
                email: email,
                dateCrawled: new Date()
            });
        });
    }

    // make a screenshot
    await page.screenshot({
        path: 'screenshots/github.png'
    });
    console.log(chalk.cyan('>> make a screenshot'));

    browser.close();

    process.on('exit', () => {
        console.log(chalk.yellow('============== END =============='));
    });
    process.exit();

}

main();
