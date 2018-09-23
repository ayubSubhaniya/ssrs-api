var expect = require('chai').expect
var HttpStatus = require('http-status-codes')
var request = require('request')
// request.debug = true

const mainURL = 'http://localhost:3001' + '/parameter'
const userId = 201501433

describe('Get all parameters', function(){

    var options = {
        uri: mainURL,
        method: 'GET',
        headers:{'Cookie': null}
    }

    it('sign in', function(done){
        var temp = {uri: 'http://localhost:3001/account/signin',
                    method: 'POST', 
                    json: {'daiictId': userId.toString(), 'password': userId.toString()}}
        request(temp, (err, res) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            options.headers.Cookie = res.headers['set-cookie']
            done()
        })
    })

    it('Get parameterType - Sealed envelope', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            body = JSON.parse(body)
            expect(body.parameter[0].name).to.equal('Sealed Envelope')
            done()
        })
    })
    
    it('Get parameterType - Stamp', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            body = JSON.parse(body)
            expect(body.parameter[1].name).to.equal('Stamp')
            done()
        })
    })
})

describe('Add and Delete a parameter', () => {
    var options = {
        uri: mainURL,
        method: 'POST',
        headers: {'Cookie': null},
        json: {
            'name': 'Signed by Director',
            'description': 'Document will be signed by Director',
            'baseCharge': '150'
        }
    }

    it('sign in', function(done){
        var temp = {uri: 'http://localhost:3001/account/signin',
                    method: 'POST', 
                    json: {'daiictId': userId.toString(), 'password': userId.toString()}}
        request(temp, (err, res) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            options.headers.Cookie = res.headers['set-cookie']
            done()
        })
    })

    var param_id;
    it('Add parameterType - Signed by Director', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.CREATED)
            param_id = body.parameter._id
            expect(body.parameter.name).to.equal('Signed by Director')
            done()
        })
    })

    it('Delete parameterType - Signed by Director', function(done){
        
        options.uri = mainURL + '/' + param_id
        options.method = 'DELETE'
        options.json = {}

        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            done()
        })
    })
})

describe('Change status of parameterType', ()=>{})

describe('Get parameter with ID', () => {
    var id = '5b71d3939257504ec82ffd71'
    var options = {
        uri: mainURL + '/' + id,
        method: 'GET',
        headers: {'Cookie': null}
    }

    it('sign in', function(done){
        var temp = {uri: 'http://localhost:3001/account/signin',
                    method: 'POST', 
                    json: {'daiictId': userId.toString(), 'password': userId.toString()}}
        request(temp, (err, res) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            options.headers.Cookie = res.headers['set-cookie']
            done()
        })
    })

    it('get parameterType - Sealed envelope', function(done) {
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            expect(JSON.parse(body).parameter.name).to.eq('Sealed Envelope')
            done()
        })
    })
})

describe('Update a parameter', () => {
    var id = '5b71d3939257504ec82ffd71'
    var options = {
        uri: mainURL + '/' + id,
        method: 'PATCH',
        headers: {'Cookie': null},
        json: {
            'baseCharge': "100",
        }
    }

    it('sign in', function(done){
        var temp = {uri: 'http://localhost:3001/account/signin',
                    method: 'POST', 
                    json: {'daiictId': userId.toString(), 'password': userId.toString()}}
        request(temp, (err, res) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            options.headers.Cookie = res.headers['set-cookie']
            done()
        })
    })

    it('update base charge - sealed envelope', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.eq(HttpStatus.OK)
            expect(body.parameter.baseCharge).to.eq(100)
            done()
        })
    })
})
