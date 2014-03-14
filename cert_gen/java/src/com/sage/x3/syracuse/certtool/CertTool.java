package com.sage.x3.syracuse.certtool;

import java.io.BufferedReader;
import java.io.Console;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.UnsupportedEncodingException;
import java.io.Writer;
import java.math.BigInteger;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.interfaces.DHPublicKey;
import javax.crypto.spec.DHParameterSpec;
import javax.crypto.spec.DHPublicKeySpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.security.auth.x500.X500Principal;

import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.openssl.EncryptionException;
import org.bouncycastle.openssl.PEMEncryptedKeyPair;
import org.bouncycastle.openssl.PEMEncryptor;
import org.bouncycastle.openssl.PEMException;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.PEMWriter;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
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
	static ConsoleWrapper wrapper = new ConsoleWrapper();
	// interactive
	boolean interactive = true;
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
	// old password of private key for CA (only necessary when generating new key)
	char[] oldCaPass = null;
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
	// port for transfer of certificate to nanny process
	int port;
	// (decrypted) key of server
	KeyPair serverKey;
	// timeout for connection
	private final static int DEFAULT_WAIT = 0;
	int connectionTimeout = DEFAULT_WAIT;

	X509CertificateHolder cert = null;

	
	// reset variables which should be cleared for the next run
	private void cleanup() {
		action = null;
		pass = null;
		capass = null;
		oldCaPass = null;
		name = null;
		dn = null;
		cn = null;
		validUntil = null;
		cert = null;
		serverKey = null;
		if (port >= 0) 
			port = 0;
	}
	
	/** Get the public key entry from a certificate. */
	private static PublicKey extractPublicKey(X509CertificateHolder cert)
			throws IOException, GeneralSecurityException {
		  JcaPEMKeyConverter conv = new JcaPEMKeyConverter();
		  conv.setProvider("SunJSSE"); 
		  return conv.getPublicKey(cert.getSubjectPublicKeyInfo());
	}

	
	private String escapeChars(String input) {
		StringBuilder result = new StringBuilder(input);
		for (int i=result.length()-1; i>= 0; i--) {
			char c =result.charAt(i);
			if (c < ' ') {
				result.replace(i, i+1, "\\x"+(c < 16 ? "0" : "")+Integer.toHexString(c));
			} 
		}
		return result.toString();

	}
	
	private void longDn(String dn) throws IOException {
		String value = null;
		if ((value = findReplace(dn, "CN", null)) != null) wrapper.println(" Name: "+escapeChars(value));
		if ((value = findReplace(dn, "OU", null)) != null) wrapper.println(" Organizational unit: "+escapeChars(value));
		if ((value = findReplace(dn, "O", null)) != null) wrapper.println(" Organization: "+escapeChars(value));
		if ((value = findReplace(dn, "L", null)) != null) wrapper.println(" City: "+escapeChars(value));
		if ((value = findReplace(dn, "ST", null)) != null) wrapper.println(" State: "+escapeChars(value));
		if ((value = findReplace(dn, "C", null)) != null) wrapper.println(" Country: "+escapeChars(value));
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

	/** return the relative path of the certificate */
	static private String getPublicKeyFileName(String name) throws CertToolException {
		if (name == null) {
			throw new CertToolException("No public key file for CA");
		} else {
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

	/** read private key from file system and decrypt it using the given passphrase */
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
				throw new PEMException("File "+filename+" does not contain private key");

			KeyPair kp = null;
			JcaPEMKeyConverter conv = new JcaPEMKeyConverter();
			conv.setProvider("SunJSSE"); 
			kp = conv.getKeyPair(keyPair);
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
				return null;
			} else
				exc = "Entry must have at least length 2";
			break;
		case C:
			if (input != null && input.length() == 2) {
				return null;
			} else
				exc = "Entry must have length 2";
			break;
		case ACTION:
			int count = Action.values().length;
			try {
				choice = Integer.parseInt(input);
			} catch (NumberFormatException ex) {
			}
			if (choice < 1 || choice > count+1) {
				exc = "Please enter a number from 1 to " + (count+1);
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
		case PORT:
		case PORTZERO:
			try {
				choice = Integer.parseInt(input);
			} catch (NumberFormatException ex) {
			}
			if (choice == 0 && test == Check.PORTZERO) 
				break;
			if (choice <= 0 || choice > 65535) {
				exc = "Port must be in the range of 1 to 65535";
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
				throw new PEMException("File "+filename+" does not contain certificate");
			return (X509CertificateHolder) result;
		} finally {
			pemParser.close();
		}
	}


	/** write certificate into file system or to the given writer (then 'name' parameter will be ignored) */
	static void writeCertificate(String name, X509CertificateHolder certificate, Writer writer)
			throws IOException {
		if (writer == null) {
			String filename = getCertFileName(name);
			wrapper.println("Write certificate " + filename + " ...");
			writer = new FileWriter(filename);
		}
		PEMWriter pemWriter = new PEMWriter(new PrintWriter(writer));
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
	 * @param writer optional writer: write to it instead to file
	 */
	static void writeKey(String name, KeyPair key, char[] passphrase, Writer writer)
			throws IOException {
		if (writer == null) {
			String filename = getKeyFileName(name);
			wrapper.println("Write private key " + filename + " ...");
			writer = new FileWriter(filename);
		}
		JcePEMEncryptorBuilder jeb = new JcePEMEncryptorBuilder("DES-EDE3-CBC");
		jeb.setProvider("SunJCE");
		PEMEncryptor pemEncryptor = jeb.build(passphrase);
		PEMWriter pemWriter = new PEMWriter(new PrintWriter(writer));
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
		issuerDn = sortDn(issuerDn);
		subjectDn = sortDn(subjectDn);
		X500Principal issuer = new X500Principal(issuerDn);
		X500Principal subject = new X500Principal(subjectDn);
		Date notBefore = new Date();
		Date notAfter = validUntil;
		BigInteger serial = new BigInteger(""+notBefore.getTime());
		JcaX509v3CertificateBuilder builder = new JcaX509v3CertificateBuilder(
				issuer, serial, notBefore, notAfter, subject, subjectKey);
		ContentSigner cs = new JcaContentSignerBuilder("SHA256withRSA")
				.build(issuerPair.getPrivate());
		X509CertificateHolder holder = builder.build(cs);
		return holder;

	}

	/** sorts the parts of a distinguished name so that the CN will be first and the country the last (important in order to have consistent 
	 * distinguished names for CA certificate and issuer of server certificate.
	 * @param dn distinguished name to sort
	 * @return sorted distinguished name
	 */
	private static String sortDn(String dn) {
		String cn = escape(findReplace(dn, "CN", null));
		String ou = escape(findReplace(dn, "OU", null));
		String o = escape(findReplace(dn, "O", null));
		String l = escape(findReplace(dn, "L", null));
		String c = escape(findReplace(dn, "C", null));
		String st = escape(findReplace(dn, "ST", null));
		String[] parts = new String[6];
		int index = 0;
		if (cn != null) parts[index++] = "CN="+cn;
		if (ou != null) parts[index++] = "OU="+ou;
		if (o != null) parts[index++] = "O="+o;
		if (l != null) parts[index++] = "L="+l;
		if (st != null) parts[index++] = "ST="+st;
		if (c != null) parts[index++] = "C="+c;
		StringBuilder result = new StringBuilder();
		for (int i = 0; i < index; i++) {
			if (i > 0) result.append(',');
			result.append(parts[i]);
		}
		return result.toString();
	}

	
	private char[] readPrivateKey(String name, char[] passphrase, String message) throws CertToolException, IOException {
		while (true) {
			if (passphrase == null) { 
				testInteractive(name == null ? "Passphrase for CA private key missing" : "Passphrase for private key missing");
				passphrase = readPassphrase(message);
			}
			try {
				KeyPair kp = readKey(name, passphrase);
				if (name == null) 
					caKey = kp;
				else
					serverKey = kp;
				return passphrase;
			} catch (EncryptionException ex) {
				if (interactive) {
					wrapper.println("Error in decryption - probably incorrect passphrase");
					passphrase = null;
				} else {
					throw new CertToolException("Error in decryption - probably incorrect passphrase");
				}
				// enter new passphrase
			} catch (FileNotFoundException ex) {
				throw new CertToolException("Private key file missing: "+ex.getMessage());				
			} catch (PEMException ex) {
				throw new CertToolException("Wrong file format: "+ex.getMessage());				
			}
		}

	}
	
	
	private static String escape(String input) {
		if (input == null) return null;
		StringBuilder result = new StringBuilder(input);
		for (int i=result.length()-1; i>= 0; i--) {
			char c =result.charAt(i);
			switch (c) {
			case '\\':
			case '>':
			case '<':
			case '#':
			case '"':
			case '=':
			case ',':
			case '+':
			case ';':
				result.insert(i,  '\\');
				break;
			default:
				break;
			}
		}
		return result.toString();
	}

	private static String unescape(String input) {
		if (input == null) return null;
		boolean backsl = false;
		StringBuilder result = new StringBuilder(input);
		for (int i=0; i<result.length(); i++) {
			char c =result.charAt(i);
			switch (c) {
			case '\\':
				if (!backsl) {
					backsl = true;
					break;
				}
				// no break!
			case '=':
			case '>':
			case '<':
			case '"':
			case '#':
			case ',':
			case '+':
			case ';':
				if (backsl) {
					result.deleteCharAt(--i);
					backsl = false;					
				}
				break;
			default:
				if (backsl && i < result.length()-1) {
					try {
						byte[] val = {Byte.parseByte(result.substring(i, i+2), 16) };
						result.replace(i-1, i+2, new String(val));
					} catch (NumberFormatException e) {
						// ignore
					}
				}
				backsl = false;
				break;
			}
		}
		return result.toString();
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
	static String findReplace(String dn, String id, String replacement) {
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
			int index2 = -1;
			boolean backsl = false;
			LOOP: for (int i = index; i<dn.length(); i++) {
				switch (dn.charAt(i)) {
				case '\\':
					backsl = !backsl;
					break;
				case ',': if (!backsl) {
					index2 = i; 
					break LOOP;
					};
					break;				
				default:
					backsl = false;
					break;
				}
			}
			if (index2 >= 0) {
				if (replacement == null)
					return unescape(dn.substring(index, index2));
				else
					return dn.substring(0, index)+escape(replacement)+dn.substring(index2);
			}
			else {
				if (replacement == null)
					return unescape(dn.substring(index));
				else
					return dn.substring(0, index)+escape(replacement);
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

		Exchange.certTool = this;
		
		// read CA certificate
		if (new File(getCertFileName(null)).exists()) {
			if (!new File(getKeyFileName(null)).exists()) {
				if (interactive) {
					wrapper.confirmMessage("CA private key not available - generate new key");
					action = Action.RENEW_KEY;
					name = null;					
				} else {
					throw new CertToolException("No CA private key available");					
				}
			}
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
			testInteractive("No task given");
			// ask for action interactively
			String act = null;
			Action[] actions = Action.values();
			wrapper.println();
			wrapper.println("Which task do you want to perform?");
			int j = 0;
			for (j = 0; j < actions.length; j++) {
				if (port >= 0 || actions[j] != Action.TRANSFER) {
					wrapper.println("(" + (j + 1) + ") "+ actions[j].getDescription());					
				}
			}
			wrapper.println("("+(j+1)+") End");
			act = input("Please enter the number of the option", Check.ACTION,
					null);
			j = Integer.parseInt(act)-1;
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
		// need passphrase for CA key
		boolean usePass = false;
		// need port
		boolean usePort = false;
		// ask whether transfer (and port) is necessary
		boolean askPort = false;
		
		if (port > 0 && name == null) {
			wrapper.println("Ignore port "+port+" because no server is set");
			port = 0;
		}
		
		wrapper.println();
		wrapper.println("Task: " + action.getDescription());
		switch (action) {
		case CREATE:
			useDn = true;
			newName = true;
			useDays = true;
			if (caCert != null) {
				caAllowed = false;				
				useCaPass = true;
				newPass = true;
				askPort = true;
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
			askPort = true;
			break;
		case RENEW_KEY:
			// do this later, when name is known
			askPort = true;
			break;
		case CHANGE_NAME:
			useCaPass = true;
			useDn = true;
			askPort = true;
			break;
		case SHOW:
			break;
		case SHOW_ALL:
			useName = false;
			break;
		case DELETE:
			caAllowed = false;
			break;
		case TRANSFER:
			useCaPass = true;
			caAllowed = false;
			usePass = true;
			usePort = true;
			break;
		}

		if (usePort && port < 0) throw new CertToolException("Cannot transfer data when -notransfer option is set");

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

			} else if (!caAllowed) {
				throw new CertToolException("No server name yet");
			}
		} else
			check(name, caAllowed ? Check.SERVER_NAME_NONE : Check.SERVER_NAME,
					newName, true);

		if (cert == null && name == null)
			cert = caCert;

		if (action == Action.RENEW_KEY) {
			if (name == null) {
				newCaPass = true;
				if (caKey == null && new File(getKeyFileName(null)).exists() && interactive) {
					try {
						oldCaPass = readPrivateKey(null, oldCaPass, "Enter passphrase of private key of CA certificate: ");						
					} catch (IOException ex) {
						wrapper.println("Cannot read CA private key - please copy ca.cacrt manually to Syracuse servers "+ex.toString());
						port = -1;
					}
				}
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
						String c = input("Country", Check.C, findReplace(dn, "C", null));
						String st = input("State", Check.DN, findReplace(dn, "ST", null));
						String l = input("City", Check.DN, findReplace(dn, "L", null));
						String o = input("Organization", Check.DN, findReplace(dn, "O", null));
						String ou = input("Organizational unit", Check.DN, findReplace(dn, "OU", null));
						if (cn == null)
							cn = input("Name", Check.DN, findReplace(dn, "CN", null));						
						dn = "CN=" + escape(cn) + ",OU="+escape(ou) + ",O="+escape(o)+",L="+escape(l)+",ST="+escape(st)+",C="+escape(c);
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
		} else if (usePass && name != null) {
			pass = readPrivateKey(name, pass, "Please enter passphrase for private key: ");
		}

		if (newCaPass) {
			if (capass == null) {
				testInteractive("No passphrase for CA private key given");
				capass = readPassphrase("Please enter passphrase for new private key of CA certificate: ");
				char[] confirm = readPassphrase("Confirm passphrase of CA private key: ");
				if (!Arrays.equals(capass, confirm)) 
					throw new CertToolException("Passphrase does not match its confirmation");				
			}
			if (name == null)
				pass = capass;
		}
		
		if (useCaPass && caKey == null) {
			if (capass == null) {				
				// use passphrase as CA passphrase for CA certificate
				if (name == null && pass != null) {
					capass = pass;
				}
			}
			capass = readPrivateKey(null, capass, "Enter passphrase of private key of CA certificate: ");
			if (name == null)
					pass = capass;
		}
		
		if (name != null && port == 0 && (askPort || usePort) && interactive) {
			port = askForTransfer(null, askPort);
		}
		return false;
	}


	private int askForTransfer(String name, boolean askPort) throws IOException, CertToolException {
		String port;
		if (name != null) 
			name = name+" ";
		else
			name = "";
		if (askPort) {
			port = input("Port of Syracuse server"+name+" if data should be transferred (no transfer for value 0)", Check.PORTZERO, false, "0");
		} else {
			port = input("Port of Syracuse server", Check.PORT, false, null);			
		}
		return Integer.parseInt(port);
	}

	/** perform the chosen action */
	void doAction() throws IOException, CertToolException,
			GeneralSecurityException, OperatorCreationException {

		String issuer;
		// (decrypted) key of server certificate
		KeyPair key;
		
		
		X509CertificateHolder caCertOld;
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
			writeKey(name, key, pass, null);
			writeCertificate(name, cert, null);
			if (name == null)
				caCert = cert;
			else {
				writePublic(name, key.getPublic());
				certNames.add(name);				
				if (port > 0) {
					Exchange.transfer(caCert, caKey, cert, key, pass, port, null);				
				}
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
			writeCertificate(name, cert, null);
			if (name == null) {
				caCert = cert;
			} else {
				if (port > 0) {
					Exchange.transfer(caCert, caKey, cert, null, null, port, null);				
				}				
			}
			wrapper.println("Finished");
			return;
		case RENEW_ALL_CERTS:
			// renew CA certificate
			wrapper.println("Update CA certificate ...");
			caCertOld = caCert;
			caCert = generateCertificate(caCert.getSubject().toString(), caKey,
					cert.getSubject().toString(), extractPublicKey(caCert),
					validUntil);
			writeCertificate(null, caCert, null);
			if (!certNames.isEmpty()) { // also update other certificates
				wrapper.println("Update server certificates ...");
				for (String certName : certNames) {
					cert = readCertificate(certName);
					cert = generateCertificate(caCert.getSubject().toString(),
							caKey, cert.getSubject().toString(),
							extractPublicKey(cert), validUntil);
					writeCertificate(certName, cert, null);
					if (port >= 0 && caKey != null) {
						int port2 = askForTransfer(null, true);
						if (port2 > 0) {
							Exchange.transfer(caCertOld, caKey, cert, null, null, port2, caCert);
						}
					}
				}
			}
			wrapper.println("Finished");
			return;
		case RENEW_KEY:
			key = generateKeyPair();
			KeyPair caKeyOld =caKey;
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
			writeCertificate(name, cert, null);
			writeKey(name, key, pass, null);
			if (name == null) {
				caCertOld = caCert;
				caCert = cert;
				if (!certNames.isEmpty()) { // also update other certificates
					wrapper.println("Update server certificates ...");
					for (String certName : certNames) {
						cert = readCertificate(certName);
						cert = generateCertificate(caCert.getSubject().toString(),
								caKey, cert.getSubject().toString(),
								extractPublicKey(cert), cert.getNotAfter());
						writeCertificate(certName, cert, null);
						if (port >= 0 && caKeyOld != null) {
							int port2 = askForTransfer(null, true);
							if (port2 > 0) {
								Exchange.transfer(caCertOld, caKeyOld, cert, null, null, port2, caCert);
							}
						}
					}
				}
			} else {
				writePublic(name, key.getPublic());
				if (port > 0) {
					Exchange.transfer(caCert, caKey, cert, key, pass, port, null);				
				}
			}
			wrapper.println("Finished");
			return;
		case TRANSFER:
			cert = readCertificate(name);
			Exchange.transfer(caCert, caKey, cert, serverKey, pass, port, null);
			break;
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
			writeCertificate(name, cert, null);
			if (name == null) {
				String oldIssuer = caCert.getSubject().toString();
				caCertOld = caCert;
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
						writeCertificate(certName, cert, null);
						if (port >= 0 && caKey != null) {
							int port2 = askForTransfer(null, true);
							if (port2 > 0) {
								Exchange.transfer(caCertOld, caKey, cert, null, null, port2, caCert);
							}
						}
					}
				}
			} else {
				if (port > 0) {
					Exchange.transfer(caCert, caKey, cert, null, null, port, null);				
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

	/** write public key file
	 * 
	 * @param name name of server
	 * @param publicKey content
	 */
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
			CertTool tool = null;
			boolean hex = false; // hex input from command line
			// read options from command line
			ARGS: for (int i = 0; i < args.length; i++) {
				String argument = args[i];
				if (argument.length() > 0 && argument.charAt(0) == '-') {
					if (argument.equals("-help") || argument.equals("-?")) {
						// help text
						wrapper.println("Invocation: java -jar certgen.jar [Task] [Parameters] [Name]");
						for (Action act : Action.values()) {
							wrapper.println("-"
									+ act.name().replace('_', '-')
											.toLowerCase() + "  "
									+ act.getDescription());
						}
						wrapper.println("Parameters for tasks:");
						wrapper.println("-pass <value>   Passphrase for server private key");
						wrapper.println("-capass <value>  Passphrase for CA private key");
						wrapper.println("-dn <value> Distinguished name of certificate subject");
						wrapper.println("-dn2 <values> Values for C, ST, L, O, OU, CN for name of certificate subject in this order");
						wrapper.println("-cn <value> Common name within distinguished name");
						wrapper.println("-days <value> Number of days of certificate validity");
						wrapper.println("-port <value> Transfer data to this port of a Syracuse server");
						wrapper.println("-wait <value> Timeout in seconds to connect to Syracuse server (default: "+DEFAULT_WAIT+")");
						wrapper.println("-notransfer Do not ask for transfer of data to Syracuse servers");
						wrapper.println("-batch  Do not allow input from console");
						wrapper.println("-hex  Value of next parameter will be decoded from Hex string");
						wrapper.println("[Name] is the server name. If omitted, action is for the CA certificate");
						return;
					}
					if (tool == null) 
						tool = new CertTool();
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
						if (argument.equals("-notransfer")) {
							if (tool.port > 0) wrapper.println("Warning: Ignore port because -notransfer option is set");
							tool.port = -1;
							continue ARGS;
						}
						if (argument.equals("-hex")) {
							hex = true;
							continue ARGS;
						}
						if ("-dn2".equals(argument)) {
							if (i >= args.length-6) 
								throw new CertToolException("Not enough arguments for distinguished name parts");
							String[] parts = new String[6];
							for (int j = 0; j<6; j++) {
								if (hex)
									parts[j] = escape(hexdecode(args[++i]));
								else
									parts[j] = escape(args[++i]);
							}
							hex = false;
							String arg = "C="+parts[0]+",ST="+parts[1]+",L="+parts[2]+",O="+parts[3]+",OU="+parts[4]+",CN="+parts[5];
							tool.checkDn(arg);							
							X500Principal p1 = new X500Principal(arg);
							arg = p1.getName();
							tool.dn = arg;
							continue ARGS;
						}
						// other options take another argument
						String arg = null;
						if (i < args.length - 1)
						{
							arg = args[++i];
							if (hex) {								
								hex = false;
								arg = hexdecode(arg);
							}							
						}
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
						if ("-port".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing port number");
							tool.check(arg, Check.PORT, false, true);
							if (tool.port == -1) wrapper.println("Warning: Ignore port because -notransfer option is set");
							tool.port = Integer.parseInt(arg);
							continue ARGS;
						}
						if ("-attempts".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing number of attempts");
							tool.check(arg, Check.DAYS, false, true);
							continue ARGS;
						}
						if ("-wait".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing wait time");
							tool.check(arg, Check.DAYS, false, true);
							tool.connectionTimeout = Integer.parseInt(arg);
							continue ARGS;
						}
						if ("-dn".equals(argument)) {
							if (arg == null) 
								throw new CertToolException("Missing distinguished name");
							try {
								X500Principal p1 = new X500Principal(arg);
								arg = p1.getName();
							} catch (Exception e) {
								throw new CertToolException("Distinguished name has wrong format: "+e.toString());
							}
							tool.checkDn(arg);							
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
						tool.name = argument.toLowerCase();
				}
				else
					throw new CertToolException("Error in argument list");
			}
			if (tool == null) 
				tool = new CertTool();

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
						wrapper.confirmMessage(text);
					}
					else {
						System.err.println(text);
						System.exit(1);						
					}

		 		} finally {
					tool.cleanup();		 			
		 		}
			} while (!tool.actionGiven && tool.interactive); // loop once when action has been specified in command line
		} catch (CertToolException ex) {
			System.err.println("Error in input data: " + ex.getMessage());
			System.exit(1);
		} catch (IOException ex) {
			System.err.println("Error in IO: "+ex.getClass().getSimpleName()+": "+ex.getMessage());
			System.exit(2);
		} catch (Exception ex) {
			ex.printStackTrace();
			System.exit(3);
		}
	}

	private static String hexdecode(String arg) throws UnsupportedEncodingException {
		byte[] temp = new byte[arg.length()/2];
		for (int j = arg.length()/2-1; j>= 0; j--) {
			temp[j] = Byte.parseByte(arg.substring(2*j, 2*j+2), 16);
		}
		arg = new String(temp, "UTF-8");
		return arg;
	}

	// test whether each required attribute appears at least once
	private void checkDn(String arg) throws CertToolException {
		boolean backsl = false;
		int index = arg.indexOf('=');
		ArrayList<String> list = new ArrayList<String>();
		String attr = arg.substring(0, index);
		list.add(attr);
		for (int i=index+1; i<arg.length(); i++) {
			char c =arg.charAt(i);
			switch (c) {
			case '\\':
				backsl = !backsl;
				break;
			case ',':
				if (!backsl) {					
					checkValue(attr, arg.substring(index+1, i));
					index = arg.indexOf('=', i);
					attr = arg.substring(i+1, index);
					list.add(attr);
					i = index;
					break;
				}
				// no break!
			default:
				backsl = false;
			}
		}
		checkValue(attr, arg.substring(index+1));
		
		checkDn1(list, "C", "country");
		checkDn1(list, "CN", "common name");
		checkDn1(list, "L", "city");
		checkDn1(list, "ST", "state");
		checkDn1(list, "O", "organization");
		checkDn1(list, "OU", "organizational unit");
		if (list.size() > 0) throw new CertToolException("Unknown attribute "+list.get(0)+" in distinguished name");
	}
	
	private void checkValue(String attr, String val) throws CertToolException {
		String value = unescape(val);
		String error;
		if (attr.equals("C")) {
			error = check(value, Check.C, false, false);
		} else {
			error = check(value, Check.DN, false, false);			
		}
		if (error != null) 
			throw new CertToolException("Error in value '"+value+"' of attribute "+attr+" of distinguished name: "+error);
	}

	private static void checkDn1(ArrayList<String> arg, String attribute, String longName) throws CertToolException {
		if (!arg.remove(attribute)) throw new CertToolException("Missing "+longName+" in distinguished name");
		if (arg.remove(attribute)) throw new CertToolException("Double "+longName+" in distinguished name");
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
	C, // check for two letter country code
	DAYS, // check for positive integer
	DAYS_NONE, // positive integer or empty
	PORT, // port number 
	PORTZERO // port number or 0
}

/** available actions */
enum Action {
	CREATE("Create new certificate and private key"), 
	RENEW_CERT("Renew the validity of the certificate"), 
	RENEW_ALL_CERTS("Renew the validity of all certificates"), 
	RENEW_KEY("Generate new private key and create certificate with same subject as before"), 
	CHANGE_NAME("Change the subject of the certificate"), 
	SHOW("Show certificate data"), 
	SHOW_ALL("Show certificate data of all certificates"), 
	DELETE("Delete certificate and private key for the named server"),
	TRANSFER("Transfer certificate and private key to the named server");

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

	void confirmMessage(String text) throws IOException {
		println(text);
		readLine("Press RETURN to continue");
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


class Exchange {
	private static final Charset UTF8 = Charset.forName("UTF8");
	private static SecureRandom sr = new SecureRandom();
	// Diffie Hellman parameters (modp2)
	private static final BigInteger p1024 = new BigInteger("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF", 16);
	private static final BigInteger g1024 = new BigInteger("2", 10);
	private static DHParameterSpec dhParams = new DHParameterSpec(p1024, g1024);
    // key pair for Diffie Hellman exchange
	private KeyPair diffieHellmanKeyPair;
	// public Diffie Hellman key (obtained from diffieHallmanKeyPair)
    private byte[] dhPubKey;
    // encrypted public Diffie Hellman key (for exchange with Syracuse nanny process)
    private byte[] encryptedDhPubKey;
	// Key of public Diffie Hellman key encryption (for exchange with Syracuse nanny process)	
	private SecretKeySpec spec;
	// IV of encrypted public Diffie Hellman key (for exchange with Syracuse nanny process)
	private byte[] ivDhPubKey;
    // current CA certificate
	private X509CertificateHolder caCert;
    // current CA key
    private KeyPair caKey;
    // identifier of CA certificate (at the moment: public key hash);
    private byte[] caCertIdentifier;
	// singleton
	private static Exchange instance;
	static CertTool certTool;
	
	Exchange() throws GeneralSecurityException {
		KeyPairGenerator keyGen = KeyPairGenerator.getInstance("DH");
		keyGen.initialize(dhParams, sr);
		diffieHellmanKeyPair = keyGen.generateKeyPair();
		dhPubKey = ((DHPublicKey) diffieHellmanKeyPair.getPublic()).getY().toByteArray();
	}	
	
	
	public static void transfer(X509CertificateHolder caCert, KeyPair caKey, X509CertificateHolder crt, KeyPair priv, char[] pass, int port, X509CertificateHolder newCaCert)  throws GeneralSecurityException, IOException, CertToolException {
		instance(caCert, caKey);
		instance.transfer(crt, priv, pass, port, newCaCert);
	}
	
	
	private static void instance(X509CertificateHolder caCert, KeyPair caKey) throws GeneralSecurityException {
		if (instance == null) {
			synchronized(sr) {
				if (instance == null) {
					instance = new Exchange();
					instance.init(caCert, caKey);
				}				
			}
		} else {
			if (caCert != instance.caCert || caKey != instance.caKey) {
				instance.init(caCert, caKey);
			}
		}
	}

	// sets the CA certificate and CA key and computes depending values
	void init(X509CertificateHolder caCert, KeyPair caKey) throws GeneralSecurityException {
		if (caCert == null) throw new RuntimeException("Internal error: no CA certificate");
		if (caKey == null) throw new RuntimeException("Internal error: no CA key");
		this.caCert = caCert;
		this.caKey = caKey;
	    // make key out of certificate
		caCertIdentifier = caCert.getSubjectPublicKeyInfo().getPublicKeyData().getBytes();
		MessageDigest hash = MessageDigest.getInstance("SHA-256");
		caCertIdentifier = hash.digest(caCertIdentifier);
		byte[] key = new byte[16];
		System.arraycopy(caCertIdentifier, 0, key, 0, key.length);
		spec = new SecretKeySpec(key, "Blowfish");

		// IV1 for DH public key
		ivDhPubKey = new byte[8]; 
		sr.nextBytes(ivDhPubKey);
		IvParameterSpec ivspec = new IvParameterSpec(ivDhPubKey);

		// encryption of DH public key
		Cipher cipher = Cipher.getInstance("Blowfish/CBC/PKCS5Padding");
		cipher.init(Cipher.ENCRYPT_MODE, spec, ivspec);
		encryptedDhPubKey = cipher.doFinal(dhPubKey);
	}

	// request to Syracuse server
	private static byte[] request(String hostname, int port, String path, byte[]... inputs) throws IOException {
		
		URL url = new URL("http", hostname, port, path);
		HttpURLConnection conn = null; 
		try {
			conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("POST");
			conn.setRequestProperty("Content-Type", "application/octet-stream");
			int length = 0;
			for (byte[] input: inputs) {
				length += input.length;
			}
			conn.setRequestProperty("Content-Length", Integer.toString(length));
			conn.setUseCaches(false);
			conn.setDoInput(true);
			conn.setDoOutput(true);
			OutputStream os = conn.getOutputStream();
			for (byte[] input: inputs) {
				os.write(input);
			}
			os.close();
			length = conn.getContentLength();
			if (length < 0) throw new IOException("Laenge");
			byte[] result = new byte[length];
			InputStream is = conn.getInputStream();
			try {
				is.read(result);				
			} finally {
				is.close();				
			}
			if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
				throw new IOException("Error: "+new String(result));
			} else {
				return result;
			}
		} finally {
			if (conn != null) conn.disconnect();
		}
	}

	void byteOutput(String text, byte[] b) {
		System.out.println(text);
		for (int i = 0; i<b.length; i++) {
			System.out.print(" "+Integer.toHexString((b[i]+256) % 256));
		}
		System.out.println();
	}

	
	/* Protocol: 
	 * key1: is obtained from public subject key of certificate (first 16 bytes of SHA-256)
	 * 
	 * First invocation:
	 * Request: 0-byte (protocol), challenge (64 bytes), IV1 (8 bytes), Diffie Hellman public key, encrypted with key1 and IV1
	 * Response: 0-byte (protocol), SHA-256 of challenge string+public key of certificate (32 bytes), second challenge (64 bytes), IV2 (8 bytes); Diffie Hellman public key, encrypted with key1 and IV2;
	 * 
	 * Check whether hash is correct
	 * Second invocation:
	 * Request: 0-byte (protocol), IV (8 bytes);String encrypted with first 16 bytes of SHA-256 of Diffie Hellman private key and IV: digital signature (RSAWith SHA256) as Hex of the following: second challenge;random string;public key;private key;CA certificate[;passphrase] 
	 * Response: 2
	 * 
	 */
	void transfer(X509CertificateHolder crt, KeyPair priv, char[] pass, int port, X509CertificateHolder newCaCert) throws IOException, CertToolException {
		HttpURLConnection conn = null;
		try {
			String crtDn = crt.getSubject().toString();
			String tcpHostname = CertTool.findReplace(crtDn, "CN", null);
			CertTool.wrapper.println("Transfer data to "+tcpHostname+":"+port+" ...");

			// first invocation			
			
			// protocol version
			byte[] protocol = {0};
			
			// challenge string
			byte[] challenge = new byte[64];
			sr.nextBytes(challenge);
			
			byte[] response = null;
			long time = System.currentTimeMillis();
			do {
				try {
					response = request(tcpHostname, port, "/nannyCommand/transferCertificate", protocol, challenge, ivDhPubKey, encryptedDhPubKey);
					break;
				} catch (ConnectException ex) {
					long timeNew = System.currentTimeMillis();
					if (timeNew-time < 1000*certTool.connectionTimeout) {
						Thread.sleep(2000);
						CertTool.wrapper.println("Try to connect to server ... ");
						continue;
					} else
						throw ex;
				}				
			} while (true);

			response = request(tcpHostname, port, "/nannyCommand/transferCertificate", protocol, challenge, ivDhPubKey, encryptedDhPubKey);
			// check response
			if (response[0] != 0 && response[0] != 1) throw new CertToolException("Wrong protocol");
			if (response[0] == 1) {
				throw new CertToolException("Error on Syracuse during key exchange: "+new String(response, 1, response.length-1, UTF8));
			}
			if (response.length < 65) throw new CertToolException("Response too short");
			// Message digest
			MessageDigest hash2 = MessageDigest.getInstance("SHA-256");
			hash2.update(challenge);			
			byte[] digest = hash2.digest(caCertIdentifier);
			// test message digest
			for (int i = 0; i<digest.length; i++)
				if (digest[i] != response[i+1]) throw new CertToolException("Wrong CA certificate");

			// get challenge bytes
			byte[] challenge2 = new byte[64];
			System.arraycopy(response, 33, challenge2, 0, challenge2.length);

			// get Diffie Hellman public key
			IvParameterSpec ivspec2 = new IvParameterSpec(response, 97, 8);
			
			// decryption of DH public key
			Cipher cipher2 = Cipher.getInstance("Blowfish/CBC/PKCS5Padding");
			cipher2.init(Cipher.DECRYPT_MODE, spec, ivspec2);
			byte[] decryptedPublicKey = cipher2.doFinal(response, 105, response.length-105);
			// compute Diffie Hellman secret
		    BigInteger bpubkeyb = new BigInteger(1, decryptedPublicKey);
		    KeyFactory keyFactory = KeyFactory.getInstance("DH");
		    DHPublicKeySpec dpks = new DHPublicKeySpec(bpubkeyb, p1024, g1024);
		    DHPublicKey dpk = (DHPublicKey) keyFactory.generatePublic(dpks);
			KeyAgreement aKeyAgree = KeyAgreement.getInstance("DH");
			aKeyAgree.init(diffieHellmanKeyPair.getPrivate());
		    aKeyAgree.doPhase(dpk, true);
		    byte[] secret = aKeyAgree.generateSecret();
		    // compute hash of secret
			hash2 = MessageDigest.getInstance("SHA-256");
			secret = hash2.digest(secret);
		    
		    
		    // second request
			StringWriter sw = new StringWriter();
			for (int i = 4; i >= 0; i--) {				
				sw.append((char) (32+sr.nextInt(95)));
			}
			sw.append('\0');
			CertTool.writeCertificate(null, crt, sw);
			sw.append('\0');
			if (priv != null) CertTool.writeKey(null, priv, pass, sw);
			sw.append('\0');
			if (newCaCert != null) CertTool.writeCertificate(null, newCaCert, sw);
			sw.append('\0');
			if (priv != null && pass != null) {
				sw.append(new String(pass));				
			}
			
			// encrypt contents with blowfish
			byte[] key3 = new byte[16];
			System.arraycopy(secret, 1, key3, 0, key3.length);
			SecretKeySpec spec3 = new SecretKeySpec(key3, "Blowfish");

			// IV1 for DH public key
			byte[] iv3 = new byte[8]; 
			sr.nextBytes(iv3);
			IvParameterSpec ivspec3 = new IvParameterSpec(iv3);

			// encryption of DH public key
			cipher2 = Cipher.getInstance("Blowfish/CBC/PKCS5Padding");
			cipher2.init(Cipher.ENCRYPT_MODE, spec3, ivspec3);
			byte[] encryptedContent = cipher2.doFinal(sw.toString().getBytes(UTF8));
			
			// sign content
			Signature instance = Signature.getInstance("SHA256withRSA");
		    instance.initSign(caKey.getPrivate());
		    instance.update(challenge2);
		    instance.update(iv3);
		    instance.update(encryptedContent);
		    byte[] signature = instance.sign();
		    
		    protocol[0] = 2;
		    byte[] lengthMarker = { (byte) (signature.length/256), (byte) (signature.length % 256) }; 

		    // second request:
			response = request(tcpHostname, port, "/nannyCommand/transferCertificate", protocol, lengthMarker, signature, iv3, encryptedContent);
			if (response[0] != 0 && response[0] != 1) throw new CertToolException("Wrong protocol");
			if (response[0] == 1) {				
				throw new CertToolException("Error on Syracuse during certificate transfer: "+new String(response, 1, response.length-1, UTF8));
			}
			CertTool.wrapper.println("Data transfer OK");
			return;
		
		} catch (CertToolException e) {
			if (certTool.interactive) {
				CertTool.wrapper.confirmMessage(e.getMessage());				
			} else 
				throw e;
			return;
		} catch (IOException e) {
			if (certTool.interactive) {
				CertTool.wrapper.confirmMessage("Cannot connect to server: "+e.toString());				
			} else
				throw e;
			return;
		} catch (Exception e) {
			if (certTool.interactive) {
				e.printStackTrace();				
				CertTool.wrapper.confirmMessage("Severe internal error");
			} else
				throw new RuntimeException(e);
			return;
		} finally {
			if (conn != null) conn.disconnect();
		}
		
	}

}

