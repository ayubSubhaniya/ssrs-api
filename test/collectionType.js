var expect = require('chai').expect
var HttpStatus = require('http-status-codes')
var request = require('request')
// request.debug = true

const mainURL = 'http://localhost:3001' + '/collectionType'
const userId = 201501405

describe('Get all collections', function(){

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

    it('Get collectionType - courier', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            body = JSON.parse(body)
            expect(body.collectionType[0].name).to.equal('Courier')
            done()
        })
    })
    
    it('Get collectionType - pickup', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            body = JSON.parse(body)
            expect(body.collectionType[1].name).to.equal('Pickup')
            done()
        })
    })
})

describe('Add collectionType', ()=>{})

describe('Change status of collectionType', ()=>{})

describe('Get collectionType with ID', () => {
    var id = '5b71d3f69257504ec82ffd74'
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

    it('get collectionType - pickup', function(done) {
        request(options, (err,res,body) => {
            expect(res.statusCode).to.equal(HttpStatus.OK)
            expect(JSON.parse(body).collectionType.name).to.eq('Pickup')
            done()
        })
    })
})

describe('Delete a collectionType', ()=>{})

describe('Update a collectionType - courier', () => {
    var id = '5b71d3d39257504ec82ffd73'
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

    it('update base charge', function(done){
        request(options, (err,res,body) => {
            expect(res.statusCode).to.eq(HttpStatus.OK)
            expect(body.collectionType.baseCharge).to.eq(100)
            done()
        })
    })
})
