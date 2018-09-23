var expect = require('chai').expect
var request = require('request')
var HttpStatus = require('http-status-codes')

const hostURL = 'http://localhost:3001/news'

describe('route /', function() {

    var options = {
        uri: hostURL,
        method: 'GET'
    }

    it('GetAllNews', function(done){
        request(options, function(err, res){
            expect(res.statusCode).to.equal(HttpStatus.OK || HttpStatus.NOT_FOUND)
            done()
        })
    })

    it('AddNews', function(done){
        options.method = 'POST'
        options.json = {

        }
    })

    it('DeleteAllNews', function(done){
        options.method = 'DELETE'
        // request(options, function(err, res){
        //     expect(res.statusCode).to.equal(HttpStatus.OK)
        //     done()
        // })
    })
})