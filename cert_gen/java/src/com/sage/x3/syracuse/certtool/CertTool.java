package com.sage.x3.syracuse.certtool;

import java.io.BufferedReader;
import java.io.Console;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.math.BigInteger;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.text.DateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import javax.security.auth.x500.X500Principal;

import org.bouncycastle.asn1.x509.SubjectPublicKeyInfo;
import org.bouncycastle.asn1.x9.X9ObjectIdentifiers;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.jcajce.JcaJceHelper;
import org.bouncycastle.jcajce.NamedJcaJceHelper;
import org.bouncycastle.openssl.EncryptionException;
import org.bouncycastle.openssl.PEMEncryptedKeyPair;
import org.bouncycastle.openssl.PEMEncryptor;
import org.bouncycastle.openssl.PEMException;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.PEMWriter;
import org.bouncycastle.openssl.jcajce.JcePEMDecryptorProviderBuilder;
import org.bouncycastle.openssl.jcajce.JcePEMEncryptorBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.OperatorCreationException;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;



/* Program for generating certificates for the nanny processes. At the moment,
 * it can be invoked via command line or as a console application
 */

public class CertTool {

	private final static String PRIVATE = "private/";
	private final static String OUTPUT = "output/";
	static final private DateFormat SDF = DateFormat.getDateTimeInstance(
			DateFormat.LONG, DateFormat.LONG);
	// console
	static private ConsoleWrapper wrapper = new ConsoleWrapper();
	// interactive
	private boolean interactive = true;
	private X509CertificateHolder caCert = null;
	private Set<String> certNames = new HashSet<String>();
	// input data
	Action action = null;
	// name of server or null for CA
	String name = null;
	// password of private key
	char[] pass = null;
	// password of private key for CA
	char[] capass = null;
	// distinguished name
	String dn = null;
	// common name (only for server certificate, not for CA). The other parts
	// will be taken from CA certificate distinguished name.
	String cn = null;
	// end of validity
	Date validUntil = null;
	// action stated in command line
	boolean actionGiven = false;
	// (decrypted) key of CA
	KeyPair caKey;

	X509CertificateHolder cert = null;

	// reset variables which should be cleared for the next run
	private void cleanup() {
		action = null;
		pass = null;
		capass = null;
		name = null;
		dn = null;
		cn = null;
		validUntil = null;
		cert = null;
	}
	
	/** Get the public key entry from a certificate.
	 * (The code can be simplified with BouncyCastle 1.50) */
	private static PublicKey extractPublicKey(X509CertificateHolder cert)
			throws IOException, GeneralSecurityException {
		/*
		 * does not work yet because of bug in bouncycastle 1.49
		 * 
		 * JcaPEMKeyConverter conv = new JcaPEMKeyConverter();
		 * conv.setProvider("SunJSSE"); return
		 * return conv.getPublicKey(cert.getSubjectPublicKeyInfo());
		 */
		// start of replacement code for the above
		JcaJceHelper helper = new NamedJcaJceHelper("SunJSSE");
		SubjectPublicKeyInfo pki = cert.getSubjectPublicKeyInfo();
		String algorithm = pki.getAlgorithm().getAlgorithm().getId();
		algorithm = findAlgorithm(algorithm);
		KeyFactory keyFactory = helper.createKeyFactory(algorithm);
		return keyFactory.generatePublic(new X509EncodedKeySpec(pki
				.getEncoded()));
		// end of replacement code
	}

	/** convert OID to algorithm  
	 * (function will not be necessary any more when BouncyCastle 1.50 is used) 
	 */
	private static String findAlgorithm(String oid) throws PEMException {
		if (X9ObjectIdentifiers.id_ecPublicKey.getId().equals(oid)) {
			return "ECDSA";
		} else if ("1.2.840.113549.1.1.1".equals(oid)) {
			return "RSA";
		} else if ("1.2.840.10040.4.1".equals(oid)) {
			return "DSA";
		}
		throw new PEMException("Cannot find algorithm for " + oid);

	}

	private void longDn(String dn) throws IOException {
		String value = null;
		if ((value = findReplace(dn, "CN", null)) != null) wrapper.println(" Name: "+value);
		if ((value = findReplace(dn, "OU", null)) != null) wrapper.println(" Organizational unit: "+value);
		if ((value = findReplace(dn, "O", null)) != null) wrapper.println(" Organization: "+value);
		if ((value = findReplace(dn, "L", null)) != null) wrapper.println(" City: "+value);
		if ((value = findReplace(dn, "ST", null)) != null) wrapper.println(" State: "+value);
		if ((value = findReplace(dn, "C", null)) != null) wrapper.println(" Country: "+value);
	}
	
	
	/** Read certificate from file system and show its subject, issuer, not after date, not before date */
	private void showCertificateData(String name) throws CertToolException,
			IOException {
		String filename = getCertFileName(name);
		X509CertificateHolder holder;
		if (name == null && caCert != null)
			holder = caCert;
		else {
			PEMParser pemParser = new PEMParser(new FileReader(filename));
			try {
				Object p = pemParser.readObject();
				if (p instanceof X509CertificateHolder) {
					holder = (X509CertificateHolder) p;
				} else
					throw new CertToolException("Not certificate");
			} finally {
				pemParser.close();
			}
		}
		wrapper.println();
		if (name == null) {
			wrapper.println("CA certificate (" + filename + ")");
		} else {
			wrapper.println("Certificate for server " + name + " (" + filename
					+ ")");
		}
		wrapper.println("Subject:");
		longDn(holder.getSubject().toString());
		wrapper.println("Issuer:");
		longDn(holder.getIssuer().toString());
		wrapper.println("Valid from " + SDF.format(holder.getNotBefore())
				+ " to " + SDF.format(holder.getNotAfter()));
	}

	/** relative path of the private key file */
	static private String getKeyFileName(String name) {
		if (name == null) {
			// CA certificate
			return PRIVATE + "ca.cakey";
		} else {
			return OUTPUT + name + ".key";
		}
	}

	/** return the relative path of the certificate */
	static private String getCertFileName(String name) {
		if (name == null) {
			// CA certificate
			return OUTPUT + "ca.cacrt";
		} else {
			return OUTPUT + name + ".crt";
		}
	}

	/** return the relative path of the public key with replacement of bad characters */
	static private String getPublicKeyFileName(String name) throws CertToolException {
		if (name == null) {
			throw new CertToolException("No public key file for CA");
		} else {
			name = name.replace('@', '_').replace('.', '_').replace('$', '_');
			return OUTPUT + name + ".pem";
		}
	}

	/** get Date object which corresponds to the given number of days from now in the future */
	static Date computeValidity(String days) {
		return new Date(System.currentTimeMillis() + 1000L * 86400L
				* Integer.parseInt(days));
	}

	/** throw exception when input from console is required but not allowed because <tt>-batch</tt> switch is set */
	private void testInteractive(String errorMsg) throws CertToolException {
		if (!interactive)
			throw new CertToolException(errorMsg);
	}

	/** generate a new RSA 2048 bit key pair */
	static KeyPair generateKeyPair() throws NoSuchAlgorithmException,
			NoSuchProviderException {
		wrapper.println("Generate key pair ...");
		KeyPairGenerator keyGen = KeyPairGenerator
				.getInstance("RSA", "SunJSSE");
		SecureRandom random = SecureRandom.getInstance("SHA1PRNG", "SUN");
		keyGen.initialize(2048, random);
		KeyPair pair = keyGen.generateKeyPair();
		return pair;
	}

	/** read private key from file system and decrypt it using the given passphrase
	 * (The code can be simplified when BouncyCastle 1.50 is used) */
	static KeyPair readKey(String name, char[] passphrase) throws IOException {
		String filename = getKeyFileName(name);
		wrapper.println("Read private key " + filename+" ...");
		PEMParser pemParser = new PEMParser(new FileReader(filename));
		try {
			Object p = pemParser.readObject();
			PEMKeyPair keyPair;
			JcePEMDecryptorProviderBuilder jdb = new JcePEMDecryptorProviderBuilder();
			jdb.setProvider("SunJCE");
			if (p instanceof PEMEncryptedKeyPair) {
				keyPair = ((PEMEncryptedKeyPair) p).decryptKeyPair(jdb
						.build(passphrase));
			} else if (p instanceof PEMKeyPair) {
				keyPair = (PEMKeyPair) p;
			} else
				throw new IOException("File does not contain private key");

			KeyPair kp = null;
			/*
			 * does not work yet because of bug in bouncycastle 1.49
			 * JcaPEMKeyConverter conv = new JcaPEMKeyConverter();
			 * conv.setProvider("SunJSSE"); kp = conv.getKeyPair(keyPair);
			 */
			// start of replacement code for the above
			JcaJceHelper helper = new NamedJcaJceHelper("SunJSSE");
			String algorithm = keyPair.getPrivateKeyInfo()
					.getPrivateKeyAlgorithm().getAlgorithm().getId();

			algorithm = findAlgorithm(algorithm);
			try {
				KeyFactory keyFactory = helper.createKeyFactory(algorithm);

				kp = new KeyPair(
						keyFactory.generatePublic(new X509EncodedKeySpec(
								keyPair.getPublicKeyInfo().getEncoded())),
						keyFactory.generatePrivate(new PKCS8EncodedKeySpec(
								keyPair.getPrivateKeyInfo().getEncoded())));
			} catch (Exception e) {
				throw new PEMException("unable to convert key pair: "
						+ e.getMessage(), e);
			}
			// end of replacement code
			return kp;
		} finally {
			pemParser.close();
		}
	}

	/** Read data from input
	 * 
	 * @param message Message to prompt before input
	 * @param test type of test which should be applied to input data
	 * @param defaultValue Default value for input data
	 * @return input data
	 */
	String input(String message, Check test, String defaultValue)
			throws IOException, CertToolException {
		return input(message, test, false, defaultValue);
	}

	/** Perform the given check on data
	 * 
	 * @param input data to check
	 * @param test type of test which should be applied to data
	 * @param newName when true, the certificate name must not already exist, when false, the certificate name must already exist
	 * @param throwExc throw a CertToolException exception when check is not OK? 
	 * @return when throwExc parameter is not true, return the value of the error (return null when there is no error)
	 * @throws CertToolException thrown when parameter throwExc is true and the check is not OK
	 */
	String check(String input, Check test, boolean newName, boolean throwExc)
			throws CertToolException {
		String exc = null;
		int choice = -1;
		switch (test) {
		case SERVER_NAME_NONE:
			if (input == null || input.length() == 0) {
				if (newName && caCert != null)
					exc = "CA certificate already generated";
				return null;
			}
			// no break!
		case SERVER_NAME:
			if (input == null || input.length() == 0)
				exc = "Server name must not be empty";
			else {
				input = input.toLowerCase();
				if (certNames.contains(input) ^ newName)
					return null;
				exc = "Server name " + input + (newName ? " already exists" : " does not exist");
			}
			break;
		case DN:
			if (input != null && input.length() >= 2) {
				if (input.indexOf(',') >= 0)
					exc = "Entry must not contain a comma";
				else
					return null;
			} else
				exc = "Entry must have at least length 2";
			break;
		case ACTION:
			int count = Action.values().length;
			try {
				choice = Integer.parseInt(input);
			} catch (NumberFormatException ex) {
			}
			if (choice < 1 || choice > count+1) {
				exc = "Please enter a number from 1 to " + count;
			} else {
				return null;
			}
			break;
		case DAYS_NONE:
			if (input == null || input.length() == 0)
				return null;
			// no break!
		case DAYS:
			try {
				choice = Integer.parseInt(input);
			} catch (NumberFormatException ex) {
			}
			if (choice <= 0) {
				exc = "Please enter a positive number";
			}
			break;
		default:
			break;
		}
		if (exc != null) {
			if (throwExc)
				throw new CertToolException(exc);
			else
				return exc;
		}
		return null;
	}

	/** Read data from input
	 * 
	 * @param message Message to prompt before input
	 * @param test type of test which should be applied to input data
	 * @param newName when true, the certificate name must not already exist, when false, the certificate name must already exist
	 * @param defaultValue Default value for input data
	 * @return input data
	 */
	String input(String message, Check test, boolean newName,
			String defaultValue) throws IOException, CertToolException {
		String result;
		do {
			result = wrapper.readLine(defaultValue != null ? message + " ["
					+ defaultValue + "]: " : message + ": ");
			if (result == null) System.exit(2);
			if (result.length() == 0 && defaultValue != null)
				result = defaultValue;
			String error = check(result, test, newName, false);
			if (error == null) {
				return result;
			}
			wrapper.println(error);
		} while (true);
	}

	/** read certificate from file system */
	static X509CertificateHolder readCertificate(String name)
			throws IOException {
		String filename = getCertFileName(name);
		wrapper.println("Read certificate " + filename);
		PEMParser pemParser = new PEMParser(new FileReader(filename));
		try {
			Object result = pemParser.readObject();
			if (!(result instanceof X509CertificateHolder))
				throw new IOException("File does not contain certificate");
			return (X509CertificateHolder) result;
		} finally {
			pemParser.close();
		}
	}


	/** write certificate into file system */
	static void writeCertificate(String name, X509CertificateHolder certificate)
			throws IOException {
		String filename = getCertFileName(name);
		wrapper.println("Write certificate " + filename + " ...");
		PEMWriter pemWriter = new PEMWriter(new PrintWriter(new FileWriter(
				filename)));
		try {
			pemWriter.writeObject(certificate);
			pemWriter.flush();
		} finally {
			pemWriter.close();
		}
	}

	/**
	 * Write private key (key pair) to file system
	 * 
	 * @param name name of certificate
	 * @param key key pair
	 * @param passphrase passphrase for encryption
	 */
	static void writeKey(String name, KeyPair key, char[] passphrase)
			throws IOException {
		String filename = getKeyFileName(name);
		wrapper.println("Write private key " + filename + " ...");
		JcePEMEncryptorBuilder jeb = new JcePEMEncryptorBuilder("DES-EDE3-CBC");
		jeb.setProvider("SunJCE");
		PEMEncryptor pemEncryptor = jeb.build(passphrase);
		PEMWriter pemWriter = new PEMWriter(new PrintWriter(new FileWriter(
				filename)));
		try {
			pemWriter.writeObject(key, pemEncryptor);
			pemWriter.flush();
		} finally {
			pemWriter.close();
		}
	}

	/** generate a new certificate
	 * 
	 * @param issuerDn distinguished name of issuer
	 * @param issuerPair private key of issuer
	 * @param subjectDn distinguished name of subject
	 * @param subjectKey public key of subject 
	 * @param validUntil certificate should be valid until this date
	 * @return created certificate
	 * @throws OperatorCreationException
	 */
	static X509CertificateHolder generateCertificate(String issuerDn,
			KeyPair issuerPair, String subjectDn, PublicKey subjectKey,
			Date validUntil) throws OperatorCreationException {
		wrapper.println("Generate certificate ...");
		X500Principal issuer = new X500Principal(issuerDn);
		X500Principal subject = new X500Principal(subjectDn);
		Date notBefore = new Date();
		Date notAfter = validUntil;
		BigInteger serial = new BigInteger("0");
		JcaX509v3CertificateBuilder builder = new JcaX509v3CertificateBuilder(
				issuer, serial, notBefore, notAfter, subject, subjectKey);
		ContentSigner cs = new JcaContentSignerBuilder("SHA256withRSA")
				.build(issuerPair.getPrivate());
		X509CertificateHolder holder = builder.build(cs);
		return holder;

	}


	/** scans in the given distinguished for the given id, e. g. common name 'CN'.
	 * if replacement is given, the value for the id will be replaced and the full dn with replacement will be returned
	 * if no replacement is given, only the value for the id will be returned.
	 * 
	 * @param dn distinguished name string to scan
	 * @param id LDAP attribute to search, e. g. CN
	 * @param replacement replacement text
	 * @return if replacement text is null, return value of attribute, otherwise return distinguished name with replacement
	 */	 
	private static String findReplace(String dn, String id, String replacement) {
		if (dn == null)
			return null;
		String findstr = id + "=";
		int index = dn.indexOf("," + findstr);
		if (index >= 0) {
			index += findstr.length() + 1;
		} else {
			if (dn.startsWith(findstr)) {
				index = findstr.length();
			}
		}
		if (index >= 0) {
			int index2 = dn.indexOf(',', index);
			if (index2 >= 0) {
				if (replacement == null)
					return dn.substring(index, index2);
				else
					return dn.substring(0, index)+replacement+dn.substring(index2);
			}
			else {
				if (replacement == null)
					return dn.substring(index);
				else
					return dn.substring(0, index)+replacement;
			}
		}
		return (replacement == null ? null : dn);
	}
	
	/** read passphrase from console */
	private static char[] readPassphrase(String message) throws IOException {
		char[] result;
		do {
			result = wrapper.readPassword(message);
			if (result == null) 
				System.exit(2);
			if (result.length >= 4)
				return result;
			wrapper.println("Passphrase must have at least length 4");
		} while (true);
	}

	/** initialize directories and list of available certificates */
	CertTool() throws IOException, CertToolException {
		
		File f = new File(PRIVATE);
		if (!f.exists()) {
			f.mkdirs();
		}
		f = new File(OUTPUT);
		if (!f.exists()) {
			f.mkdirs();
		}

		// read CA certificate
		if (new File(getCertFileName(null)).exists()) {
			if (!new File(getKeyFileName(null)).exists())
				throw new CertToolException("No CA private key available");
			caCert = readCertificate(null);
			// read files
			File[] fileArray = new File(OUTPUT).listFiles();
			for (File certFile : fileArray) {
				String certname = certFile.getName();
				if (certname.endsWith(".crt")) {
					certNames.add(certname.substring(0, certname.length() - 4));
				}
			}
		}
	}

	/** read missing data for actions 
	 * Return value: true: finish program */
	boolean prepareAction() throws CertToolException, IOException,
			GeneralSecurityException, OperatorCreationException {
		// if no CA certificate present, generate this first
		if (caCert == null) {
			if (action != null && action != Action.CREATE)
				throw new CertToolException(
						"Have to create CA certificate first");
			if (name != null)
				throw new CertToolException(
						"Cannot handle certificates for a server before CA certificate has been created");
			action = Action.CREATE;
		}

		if (action == null) {
			testInteractive("No action given");
			// ask for action interactively
			String act = null;
			Action[] actions = Action.values();
			wrapper.println();
			wrapper.println("Which action do you want to perform?");
			int j = 0;
			for (j = 0; j < actions.length; j++) {
				wrapper.println("(" + (j + 1) + ") "
						+ actions[j].getDescription());
			}
			wrapper.println("("+(j+1)+") End");
			act = input("Please enter the number of the option", Check.ACTION,
					null);
			j = act.charAt(0) - '1';
			if (j >= Action.values().length) // special 'End' action
				return true;
			action = Action.values()[j];
		}

		// collect prerequisites for actions
		// need server name
		boolean useName = true;
		// server name may be empty (for CA certificate) 
		boolean caAllowed = true;
		// server name must not exist yet
		boolean newName = false;
		// enter new passphrase for server key
		boolean newPass = false;
		// enter new passphrase for CA key
		boolean newCaPass = false;
		// enter passphrase for existing CA key
		boolean useCaPass = false;
		// need subject DN
		boolean useDn = false;
		// need validity of certificate
		boolean useDays = false;
		
		wrapper.println();
		wrapper.println("Action: " + action.getDescription());
		switch (action) {
		case CREATE:
			useDn = true;
			newName = true;
			useDays = true;
			if (caCert != null) {
				caAllowed = false;				
				useCaPass = true;
				newPass = true;
			} else {
				newCaPass = true;
			}
			break;
		case RENEW_ALL_CERTS:
			useName = false;
			// no break!
		case RENEW_CERT:
			useCaPass = true;
			useDays = true;
			break;
		case RENEW_KEY:
			// do this later, when name is known
			break;
		case CHANGE_NAME:
			useCaPass = true;
			useDn = true;
			break;
		case SHOW:
			break;
		case SHOW_ALL:
			useName = false;
			break;
		case DELETE:
			caAllowed = false;
			break;
		}

		if (name == null && useName && interactive && caCert != null) {
			if (newName || !certNames.isEmpty()) {
				if (caAllowed) {
					name = input("Name of server (empty input for CA)",
							Check.SERVER_NAME_NONE, newName, null);
				} else {
					name = input("Name of server", Check.SERVER_NAME, newName,
							null);
				}
				if (name.length() == 0)
					name = null;
				else {
					name = name.toLowerCase();
				}

			}
		} else
			check(name, caAllowed ? Check.SERVER_NAME_NONE : Check.SERVER_NAME,
					newName, true);

		if (cert == null && name == null)
			cert = caCert;

		if (action == Action.RENEW_KEY) {
			if (name == null) {
				newCaPass = true;
				caKey = null;
			} else {
				newPass = true;
				useCaPass = true;				
			}
		}
		
		if (useDn && dn == null) {
			if (name == null) {
				if (dn == null) {
					if (caCert != null) {
						dn = caCert.getSubject().toString();
					}
					if (interactive) {
						String c = input("Country", Check.DN, findReplace(dn, "C", null));
						String st = input("State", Check.DN, findReplace(dn, "ST", null));
						String l = input("City", Check.DN, findReplace(dn, "L", null));
						String o = input("Organization", Check.DN, findReplace(dn, "O", null));
						String ou = input("Organizational unit", Check.DN, findReplace(dn, "OU", null));
						if (cn == null)
							cn = input("Name", Check.DN, findReplace(dn, "CN", null));						
						dn = "C=" + c + ",ST=" + st + ",L=" + l+ ",O=" + o + ",OU=" + ou +",CN=" + cn;
					} else {
						if (dn == null || cn == null) 
							testInteractive("No subject given");
						dn = findReplace(dn, "CN", cn);
					}
				}
			} else {
				dn = caCert.getSubject().toString();
				if (cn == null) {
					if (!newPass)
						cert = readCertificate(name);
					testInteractive("No subject name given");
					cn = input("Server name for TCP connections", Check.DN,
							cert != null ? findReplace(cert.getSubject().toString(), "CN", null) : name);
				}
				dn = findReplace(dn, "CN", cn);
			}
		}

		if (validUntil == null && useDays) {
			testInteractive("No validity of certificate given");
			if (caCert != null)
				validUntil = caCert.getNotAfter();
			if (name != null && certNames.contains(name)) {
				if (cert == null)
					cert = readCertificate(name);
				validUntil = cert.getNotAfter();									
			}
			if (validUntil != null) {
				String newDays = input(
						"Enter days of validity (when input is empty, validity will be until "
								+ SDF.format(validUntil) + ")",
						Check.DAYS_NONE, null);
				if (newDays.length() > 0)
					validUntil = computeValidity(newDays);
				
			} else {
				validUntil = computeValidity(input("Days of validity",
						Check.DAYS, null));				
			}				
		}
		
		if (newPass) {
			if (pass == null && name != null) {
				testInteractive("No passphrase given");
				pass = readPassphrase("Enter passphrase for new private key: ");
				if (interactive) {
					char[] confirm = readPassphrase("Confirm passphrase of private key: ");
					if (!Arrays.equals(pass, confirm)) 
						throw new CertToolException("Passphrase does not match its confirmation");				
				}			
			}
		}

		if ((useCaPass || newCaPass) && caKey == null) {
			if (capass == null) {				
				// use passphrase as CA passphrase for CA certificate
				if (name == null && pass != null) {
					capass = pass;
				} else {
					testInteractive("No CA passphrase given");
					while (true) {
						capass = readPassphrase(newCaPass ? "Enter passphrase for new private key of CA certificate: " : "Enter passphrase of private key of CA certificate: ");
						if (newCaPass) {
							char[] confirm = readPassphrase("Confirm passphrase of CA private key: ");
							if (!Arrays.equals(capass, confirm)) 
								throw new CertToolException("Passphrase does not match its confirmation");
							break;							
						} else {
							try {
								caKey = readKey(null, capass);
								break;
							} catch (EncryptionException ex) {
								wrapper.println("Error in decryption - probably incorrect passphrase");
								// enter new passphrase
							}
						}
					}
					if (name == null)
						pass = capass;
				}
			} else {
				if (useCaPass) {
					try {
						caKey = readKey(null, capass);
					} catch (EncryptionException ex) {
						throw new CertToolException("Error in decryption - probably incorrect passphrase");						
					}					
				}
			}
		}
		return false;
	}


	/** perform the chosen action */
	void doAction() throws IOException, CertToolException,
			GeneralSecurityException, OperatorCreationException {

		String issuer;
		// (decrypted) key of server certificate
		KeyPair key;

		// Perform actions
		switch (action) {
		case CREATE:
			// create new certificate
			key = generateKeyPair();
			if (name != null) {
				issuer = caCert.getSubject().toString();
			} else {
				caKey = key;
				issuer = dn;
			}
			cert = generateCertificate(issuer, caKey, dn, key.getPublic(),
					validUntil);
			writeKey(name, key, pass);
			writeCertificate(name, cert);
			if (name == null)
				caCert = cert;
			else {
				writePublic(name, key.getPublic());
				certNames.add(name);				
			}
			wrapper.println("Finished");
			return;
		case RENEW_CERT:
			if (name == null) {
				cert = caCert;
			} else {
				if (cert == null)
					cert = readCertificate(name);
			} 
			cert = generateCertificate(caCert.getSubject().toString(), caKey,
					cert.getSubject().toString(), extractPublicKey(cert),
					validUntil);
			writeCertificate(name, cert);
			if (name == null)
				caCert = cert;
			wrapper.println("Finished");
			return;
		case RENEW_ALL_CERTS:
			// renew CA certificate
			wrapper.println("Update CA certificate ...");
			caCert = generateCertificate(caCert.getSubject().toString(), caKey,
					cert.getSubject().toString(), extractPublicKey(caCert),
					validUntil);
			writeCertificate(null, caCert);
			if (!certNames.isEmpty()) { // also update other certificates
				wrapper.println("Update server certificates ...");
				for (String certName : certNames) {
					cert = readCertificate(certName);
					cert = generateCertificate(caCert.getSubject().toString(),
							caKey, cert.getSubject().toString(),
							extractPublicKey(cert), validUntil);
					writeCertificate(certName, cert);
				}
			}
			wrapper.println("Finished");
			return;
		case RENEW_KEY:
			key = generateKeyPair();
			if (name == null) {
				caKey = key;
				cert = caCert;
				pass = capass;
			} else {
				if (cert == null) {
					cert = readCertificate(name);
				}
			}
			cert = generateCertificate(caCert.getSubject().toString(), caKey,
					cert.getSubject().toString(), key.getPublic(), cert.getNotAfter());
			writeCertificate(name, cert);
			writeKey(name, key, pass);
			if (name == null) {
				caCert = cert;
				if (!certNames.isEmpty()) { // also update other certificates
					wrapper.println("Update server certificates ...");
					for (String certName : certNames) {
						cert = readCertificate(certName);
						cert = generateCertificate(caCert.getSubject().toString(),
								caKey, cert.getSubject().toString(),
								extractPublicKey(cert), cert.getNotAfter());
						writeCertificate(certName, cert);
					}
				}
			} else {
				writePublic(name, key.getPublic());
			}
			wrapper.println("Finished");
			return;
		case CHANGE_NAME:
			if (name == null) {
				cert = caCert;
				issuer = dn;
			} else {
				cert = readCertificate(name);
				issuer = caCert.getSubject().toString();
			}
			cert = generateCertificate(issuer, caKey, dn,
					extractPublicKey(cert), cert.getNotAfter());
			writeCertificate(name, cert);
			if (name == null) {
				String oldIssuer = caCert.getSubject().toString();
				caCert = cert;
				if (!certNames.isEmpty()) { // also update other certificates
					wrapper.println("Update server certificates ...");
					String c = findReplace(oldIssuer, "C", null);
					String st = findReplace(oldIssuer, "ST", null);
					String l = findReplace(oldIssuer, "L", null);
					String o = findReplace(oldIssuer, "O", null);
					String ou = findReplace(oldIssuer, "OU", null);
					for (String certName : certNames) {
						cert = readCertificate(certName);
						String certDN = cert.getSubject().toString();
						if (c.equals(findReplace(certDN, "C", null)) && st.equals(findReplace(certDN, "ST", null)) &&
							l.equals(findReplace(certDN, "L", null)) && o.equals(findReplace(certDN, "O", null)) &&
							ou.equals(findReplace(certDN, "OU", null))) {
							certDN = findReplace(issuer, "CN", findReplace(certDN, "CN", null));							
						}
						cert = generateCertificate(issuer, caKey, certDN, extractPublicKey(cert),
								cert.getNotAfter());
						writeCertificate(certName, cert);
					}
				}
			}
			wrapper.println("Finished");
			return;
		case DELETE:
			if (name == null)
				throw new CertToolException("Cannot delete CA certificate");
			if (new File(getKeyFileName(name)).delete()
					&& new File(getCertFileName(name)).delete()) {
				wrapper.println("Certificate and private key deleted for "
						+ name);
				if (new File(getPublicKeyFileName(name)).delete()) {
					wrapper.println("Public key deleted for "
							+ name);					
				}
				certNames.remove(name);
			}
			else
				wrapper.println("Could not delete certificate and private key for "
						+ name);
			return;
		case SHOW:
			showCertificateData(name);
			return;
		case SHOW_ALL:
			// CA certificate
			showCertificateData(null);
			for (String certName : certNames) {
				showCertificateData(certName);
			}
			return;
		}

	}

	static private void writePublic(String name, PublicKey publicKey) throws IOException, CertToolException {
		String filename = getPublicKeyFileName(name);
		wrapper.println("Write public key " + filename + " ...");
		PEMWriter pemWriter = new PEMWriter(new PrintWriter(new FileWriter(
				filename)));
		try {
			pemWriter.writeObject(publicKey);
			pemWriter.flush();
		} finally {
			pemWriter.close();
		}
	}


	/**
	 * Main function: will read and parse command line options
	 * @param args command line arguments
	 */
	public static void main(String[] args) {
		try {

			CertTool tool = new CertTool();

			// read options from command line
			ARGS: for (int i = 0; i < args.length; i++) {
				String argument = args[i];
				if (argument.length() > 0 && argument.charAt(0) == '-') {
					// parse option
					try { // action arguments
						Action temp = Action.valueOf(argument.substring(1)
								.replace('-', '_').toUpperCase());
						tool.action = temp;
						if (tool.actionGiven)
							throw new CertToolException(
									"Only one action can be specified");
						else
							tool.actionGiven = true;
						continue;
					} catch (IllegalArgumentException ex) { // other arguments
						if (argument.equals("-batch")) {
							tool.interactive = false;
							continue ARGS;
						}
						if (argument.equals("-help") || argument.equals("-?")) {
							// help text
							wrapper.println("Invocation: java -jar certgen.jar [Action] [Parameters] [Name]");
							for (Action act : Action.values()) {
								wrapper.println("-"
										+ act.name().replace('_', '-')
												.toLowerCase() + "  "
										+ act.getDescription());
							}
							wrapper.println("Parameters for actions:");
							wrapper.println("-pass <value>   Passphrase for server private key");
							wrapper.println("-capass <value>  Passphrase for CA private key");
							wrapper.println("-dn <value> Distinguished name of certificate subject");
							wrapper.println("-cn <value> Common name within distinguished name");
							wrapper.println("-days <value> Number of days of certificate validity");
							wrapper.println("-batch  Do not allow input from console");
							wrapper.println("[Name] is the server name. If omitted, action is for the CA certificate");
							return;
						}
						// other options take another argument
						String arg = null;
						if (i < args.length - 1)
							arg = args[++i];
						if ("-pass".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing passphrase");
							tool.pass = arg.toCharArray();
							continue ARGS;
						}
						if ("-capass".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing CA passphrase");
							tool.capass = arg.toCharArray();
							continue ARGS;
						}
						if ("-dn".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing distinguished name");
							tool.dn = arg;
							continue ARGS;
						}
						if ("-cn".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing common name");
							tool.check(arg, Check.DN, false, true);
							tool.cn = arg;
							continue ARGS;
						}
						if ("-days".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing days");
							tool.check(arg, Check.DAYS, false, true);
							tool.validUntil = computeValidity(arg);
							continue ARGS;
						}
						throw new CertToolException("Invalid argument "	+ argument);
					}
				}
				if (i == args.length - 1) {
					if (argument.length() > 0)
						tool.name = argument;
				}
				else
					throw new CertToolException("Error in argument list");
			}

			// check input data, maybe ask for information
			do {
				try {
					if (tool.prepareAction())
						break; // finish when 'END' has been chosen
					// do action
					tool.doAction();					
		 		} catch (CertToolException ex) {
		 			String text = "Error in input data: " + ex.getMessage();
					if (tool.interactive) {
						wrapper.println(text);
						wrapper.readLine("Press ENTER");
					}
					else
						System.err.println(text);

		 		} finally {
					tool.cleanup();		 			
		 		}
			} while (!tool.actionGiven && tool.interactive); // loop once when action has been specified in command line
		} catch (CertToolException ex) {
			System.err.println("Error in input data: " + ex.getMessage());
		} catch (Exception ex) {
			ex.printStackTrace();
		}
	}
}

/** Special exception for input errors */
class CertToolException extends Exception {
	private static final long serialVersionUID = 1L;

	CertToolException(String message) {
		super(message);
	}
}

/** Types of input checks */
enum Check {
	SERVER_NAME_NONE, // server name or empty
	SERVER_NAME, // server namy only
	ACTION, // number of action
	DN, // check for part of distinguished name (at least 2 characters, no
		// comma)
	DAYS, // check for positive integer
	DAYS_NONE // positive integer or empty
}

/** available actions */
enum Action {
	CREATE("Create new certificate and key"), 
	RENEW_CERT("Renew the validity of the certificate"), 
	RENEW_ALL_CERTS("Renew the validity of all certificates"), 
	RENEW_KEY("Generate new key and create certificate with same subject as before"), 
	CHANGE_NAME("Change the subject of the certificate"), 
	SHOW("Show certificate data"), 
	SHOW_ALL("Show certificate data of all certificates"), 
	DELETE("Delete certificate and private key for the named server");

	private final String description;

	Action(String desc) {
		this.description = desc;
	}

	public String getDescription() {
		return this.description;
	}
};


/** Console wrapper
 * The console is not available when developing under Eclipse. This class wraps System.console()
 * (if available) and normal input/output via System.in, System.out. Advantage is that the code
 * works also without Console and that when Console is available, password input is without echo.  
 */
class ConsoleWrapper {
	Console cons = System.console();
	BufferedReader reader;
	PrintWriter writer;

	ConsoleWrapper() {
		if (cons == null) {
			reader = new BufferedReader(new InputStreamReader(System.in));
			writer = new PrintWriter(System.out);
		} else {
			writer = cons.writer();
		}
	}

	void println(String s) {
		writer.println(s);
		writer.flush();
	}

	void println() {
		writer.println();
	}

	String readLine(String text) throws IOException {
		writer.print(text);
		writer.flush();
		if (cons != null) {
			return cons.readLine();
		}
		return reader.readLine();
	}

	char[] readPassword(String text) throws IOException {
		if (cons != null) {
			writer.print(text);
			writer.flush();
			return cons.readPassword();
		}
		return this.readLine(text).toCharArray();
	}
}
