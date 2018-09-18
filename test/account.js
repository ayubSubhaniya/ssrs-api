var rand = require('random-number')
const expect = require('chai').expect
const HttpStatus = require('http-status-codes')
const request = require('request')
// request.debug = true

const hostURL = 'http://localhost:3001/account'

const userId = rand({
    min: 201501001,
    max: 201501999,
    integer: true
});

describe('Signup', function() {

    var options = {
        uri: hostURL + '/signup',
        method: 'POST',
        json: {
            "daiictId": userId.toString(),
            "password": "abcdefgh"
        }
    };

    var hash_param = '???';
    it('returns status 201 - Verification link sent', function(done){
        request(options, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.CREATED);
            hash_param = res.body;
            done();
        });
    });

    it('returns status 200 - Email verified', function(done){
        var url = hostURL + '/verify/' + options.json.daiictId + '?id=' + hash_param;
        request(url, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.OK);
            done();
        })
    });
});

describe('Signin', function() {

    var options = {
        uri: hostURL + '/signin',
        method: 'POST',
        json: {
            "daiictId": userId.toString(),
            "password": "201501000"
        }
    };

    it('returns status 401 - Wrong credentials', function(done) {
        request(options, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.UNAUTHORIZED);
            done();
        });
    });

    it('returns status 202 - Correct credentials', function(done) {
        options.json.password = "abcdefgh";
        
        request(options, function(err, res, body){
            expect(res.statusCode).to.equal(HttpStatus.ACCEPTED);
            
            var user = body.user;
            expect(user).to.include({"daiictId": userId.toString(), "isActive": true});
            done();
        });
    });
});

describe('Change password', function() {

    var options = {
        uri: hostURL + '/changePassword',
        method: 'POST',
        json: {
            "daiictId": userId.toString(),
            "password": "abcdefgh",
            "newPassword": userId.toString()
        }
    }

    it('returns status 202', function(done){
        request(options, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.ACCEPTED);
            done();
        })
    })
});

describe('Signout', function() {

    var temp = {
        uri: hostURL + '/signin',
        method: 'POST',
        json: {'daiictId': userId.toString(), 'password': userId.toString()}
    }
    var options = {
        uri: hostURL + '/signout',
        method: 'GET',
        headers:{
            "Cookie": null
        }
    };

    it('signing in...', function(done){
        request(temp, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.ACCEPTED)
            options.headers.Cookie = res.headers['set-cookie']
            done()
        })
    })

    it('returns status 200 - signout successful', function(done){
        request(options, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.OK);
            var str = res.headers['set-cookie'][0].split(';')[0]
            expect(str.length).to.lessThan(5)
            done();
        });
    });
});
