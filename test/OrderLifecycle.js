const HttpStatus = require('http-status-codes');
const chai = require('chai');
const { expect } = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();
const { describe } = require('mocha');
const mongoUnit = require('mongo-unit');

const { orderStatus, cartStatus } = require('../configuration');

test_user_id = '201501086';
test_user_pass = '201501086';

chai.use(chaiHttp);
const testMongoUrl = process.env.DB_URI;

describe('order lifecycle', () => {
    // const testData = require('./testData.json');
    // beforeEach(() => mongoUnit.initDb(testMongoUrl, testData));
    // afterEach(() => mongoUnit.drop());

    let cookies = null;
    it('it should sign in to user account', (done) => {
        const body = {
            'daiictId': test_user_id,
            'password': test_user_pass
        };
        chai.request(server)
            .post('/account/signin')
            .send(body)
            .end((err, res) => {
                if (err) {
                    done(err);
                }
                res.should.have.status(HttpStatus.OK);
                res.body.should.be.a('object');
                res.body.should.have.property('user');
                res.body.user.should.have.property('userInfo');
                res.body.user.userInfo.should.have.property('user_id')
                    .eql(test_user_id);
                expect(res)
                    .to
                    .have
                    .cookie('jwt');

                cookies = res.header['set-cookie'].pop()
                    .split(';')[0];
                done();
            });
    });

    let service = null;
    it('it should get list of all services', (done) => {
        const body = {};
        chai.request(server)
            .get('/service')
            .set('Cookie', cookies)
            .end((err, res) => {
                if (err) {
                    done(err);
                }
                res.should.have.status(HttpStatus.OK);
                res.body.should.be.a('object');
                res.body.should.have.property('service');
                service = res.body.service[0];
                done();
            });
    });

    it('it should add order of a service', (done) => {
        const body = {
            'order': {
                'service': service._id,
                'unitsRequested': 1,
                'comment': 'Get order fast'
            }
        };
        chai.request(server)
            .post('/order')
            .send(body)
            .set('Cookie', cookies)
            .end((err, res) => {
                if (err) {
                    done(err);
                }
                res.should.have.status(HttpStatus.CREATED);
                res.body.should.be.a('object');
                res.body.should.have.property('order');
                res.body.order.should.have.property('status')
                    .eql(orderStatus.unplaced);
                done();
            });
    });

});
