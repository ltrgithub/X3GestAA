-------------
## sign function 

``` javascript
var signature = instance.sign(_, algorithm, data, options);
```

Sign data with private key from the certificate entity

* The `algorithm` parameter represents the algorithm to apply, e. g. RSA-SHA1
* The `data` parameter represents data to sign (string or buffer)
* The `options` parameter is optional and an object with keys `data_encoding` (specifies the encoding of the data 
  (binary as a default or utf8) when data is a string), `output_encoding` (represents the encoding wanted for signature)

Example: the invocation
`digest(_, 'bla', 'RSA-SHA1', 'a', {input_encoding: 'utf8'})`
gives the same result as the standard output of the command
`openssl dgst -sha1 -passin pass:pwd -sign bla.key input.txt` 
where `bla.key` is assumed to be the encrypted private key file with passphrase 'pwd', which is stored in the instance 'bla' of the certificate entity.

-------------
## verify function 

``` javascript
var verify = instance.verify(_, algorithm, data, signature, data_encoding, signature_encoding)
```

Verifies data with public certificate from the certificate entity

* The `algorithm` parameter represents the algorithm to apply, e. g. RSA-SHA1
* The `data` parameter represents data to verify (string or buffer).
* The `signature` parameter contains the previously generated signature
* The `options` parameter is optional and an object with keys `data_encoding` (specifies the encoding of the data 
  (binary as a default or utf8) when data is a string), `signature_encoding` (represents the encoding used for signature)

Result is `true` when the check is successful, `false` otherwise.

-------------
## streamHttpRequest function 

``` javascript
var str = instance.streamHttpRequest(_, options)
```

Creates an https request with the data from this certificate

* The `options` parameter contains the non-SSL parts such as `method`, `url`

Returns an HttpClientRequest obtained from streamline

------------------
## getPEMCertificate
``` javascript
var certificate = instance.getPEMCertificate(_)
```
retrieves the complete certificate text in PEM format as a string.
Only returns locally available certificates (not server certificates of other servers)
