# puppeteer-demo

> an example of [puppeteer](https://github.com/GoogleChrome/puppeteer), based on the [article](https://medium.com/@e_mad_ehsan/getting-started-with-puppeteer-and-chrome-headless-for-web-scrapping-6bf5979dee3e) on Medium,

## Install

```shell
npm install
```

## Usage

1. create `creds.js` file in project root.

```shell
touch creds.js
```

2. add a new dummy github acount info in `creads.js`.

```javascript
module.exports = {
    username: '<GITHUB_USERNAME>',
    password: '<GITHUB_PASSWORD>'
};
```

3. run the script to see the result.

```shell
npm start
```
