﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;


namespace CommonDataHelper
{
    public static class CookieHelper
    {
        private static CookieContainer _cookieContainer = null;
        public static CookieContainer CookieContainer
        {
            get { return _cookieContainer; }
            set { _cookieContainer = value; }
        }

        private static string _userUuid = null;
        public static string UserUuid
        {
            get
            {
                if (string.IsNullOrEmpty(_userUuid))
                {
                    foreach (Cookie cookie in CookieContainer.GetCookies(BaseUrlHelper.BaseUrl))
                    {
                        if (cookie.Name.StartsWith("user.profile"))
                        {
                            _userUuid = extractUserUuid(cookie.Value);
                            break;
                        }
                    }
                }
                return _userUuid;
            }
        }

        private static string _role = null;
        public static string Role
        {
            get
            {
                if (string.IsNullOrEmpty(_role))
                {
                    foreach (Cookie cookie in CookieContainer.GetCookies(BaseUrlHelper.BaseUrl))
                    {
                        if (cookie.Name.StartsWith("user.profile"))
                        {
                            _role = extractRole(cookie.Value);
                            break;
                        }
                    }
                }
                return _role;
            }
        }

        private static string _locale = null;
        public static string Locale
        {
            get
            {
                if (string.IsNullOrEmpty(_locale))
                {
                    foreach (Cookie cookie in CookieContainer.GetCookies(BaseUrlHelper.BaseUrl))
                    {
                        if (cookie.Name.StartsWith("user.profile"))
                        {
                            _locale = extractLocale(cookie.Value);
                            break;
                        }
                    }
                }
                return _locale;
            }
        }

        private static string extractUserUuid(string cookieValue)
        {
            /*
            * Ideally we should have a .net implementation of JSURL.
            */
            string userUuid = string.Empty;

            if (cookieValue.StartsWith("~"))
            {
                cookieValue = cookieValue.Remove(0, 1);

                /*
                 * Remove the start and end curly braces
                 */
                cookieValue = cookieValue.Remove(cookieValue.IndexOf('('), 1);
                cookieValue = cookieValue.Remove(cookieValue.Length-1);

                Dictionary<string, string> userProfileDictionary = new Dictionary<string,string>();
                buildUserProfileDictionary(cookieValue, userProfileDictionary);
                userUuid = userProfileDictionary["user"];
            }
            return userUuid; ;
        }

        private static string extractRole(string cookieValue)
        {
            /*
            * Ideally we should have a .net implementation of JSURL.
            */
            string role = string.Empty;

            if (cookieValue.StartsWith("~"))
            {
                cookieValue = cookieValue.Remove(0, 1);

                /*
                 * Remove the start and end curly braces
                 */
                cookieValue = cookieValue.Remove(cookieValue.IndexOf('('), 1);
                cookieValue = cookieValue.Remove(cookieValue.Length - 1);

                Dictionary<string, string> userProfileDictionary = new Dictionary<string, string>();
                buildUserProfileDictionary(cookieValue, userProfileDictionary);
                role = userProfileDictionary["role"];
            }
            return role;
        }

        private static string extractLocale(string cookieValue)
        {
            /*
            * Ideally we should have a .net implementation of JSURL.
            */
            string locale = string.Empty;

            if (cookieValue.StartsWith("~"))
            {
                cookieValue = cookieValue.Remove(0, 1);

                /*
                 * Remove the start and end curly braces
                 */
                cookieValue = cookieValue.Remove(cookieValue.IndexOf('('), 1);
                cookieValue = cookieValue.Remove(cookieValue.Length - 1);

                Dictionary<string, string> userProfileDictionary = new Dictionary<string, string>();
                buildUserProfileDictionary(cookieValue, userProfileDictionary);
                locale = userProfileDictionary["loc"];
            }
            return locale; ;
        }


        private static void buildUserProfileDictionary(string cookieValue, Dictionary<string, string> userProfileDictionary)
        {
            int keyStartPosition = 0;
            int valueStartPosition = 0;
            string key = string.Empty;
            for (int i = 0; i < cookieValue.Length; i++)
            {
                if (cookieValue[i] == '~')
                {
                    if (i + 1 < cookieValue.Length && cookieValue[i + 1] == '\'')
                    {
                        key = cookieValue.Substring(keyStartPosition, i);
                        valueStartPosition = i + 2;
                        if (Regex.Matches(cookieValue, @"~'").Count == 1)
                        {
                            string value = cookieValue.Substring(valueStartPosition);
                            userProfileDictionary.Add(key, value);
                            break;
                        }
                    }
                    else
                    {
                        string value = cookieValue.Substring(valueStartPosition, i - valueStartPosition);
                        userProfileDictionary.Add(key, value);
                        buildUserProfileDictionary(cookieValue.Substring(++i), userProfileDictionary);
                        break;
                    }
                }
            }
        }

        public static void setCookies(string cookies)
        {
            string[] cookiesArray = cookies.Split(';');
            for (int i = 0; i < cookiesArray.Count(); i++)
            {
                string rawCookie = cookiesArray[i];

                if (rawCookie.Contains(","))
                {
                    //regexp for Date format per RFC http://www.w3.org/Protocols/rfc2109/rfc2109 Wdy, DD-Mon-YY HH:MM:SS GMT
                    string dateRegExp = @"(?<day>expires=[A-Z,a-z]{3}),(?<date>\s\d{2}-[A-Z,a-z]{3}-\d{4}\s\d{2}:\d{2}:\d{2}\sgmt)";
                    string replaceDateExp = @"${day}${date}";
                    rawCookie = Regex.Replace(rawCookie, dateRegExp, replaceDateExp, RegexOptions.IgnoreCase);
                }
                string[] multipleCookies = rawCookie.Split(new char[] { ',' });

                for (int j = 0; j < multipleCookies.Length; j++)
                {
                    Cookie cookie = new Cookie();
                    string[] cookieValues = multipleCookies[j].Split(new char[] { ';' });

                    string[] paramNameVale;
                    foreach (string param in cookieValues)
                    {
                        paramNameVale = param.Trim().Split(new char[] { '=' });
                        paramNameVale[0] = paramNameVale[0].ToLower();

                        if (paramNameVale[0] == "domain")
                            cookie.Domain = param.Split(new char[] { '=' })[1];
                        else if (paramNameVale[0] == "expires")
                        {
                            string date = paramNameVale[1];
                            //Date format per RFC http://www.w3.org/Protocols/rfc2109/rfc2109 Wdy, DD-Mon-YY HH:MM:SS GMT
                            date = Regex.Replace(date, @"(?<day>(sun
                                            mon
                                            tue
                                            wed
                                            thu
                                            fri
                                            sat))", @"${day},", RegexOptions.IgnoreCase);
                            cookie.Expires = Convert.ToDateTime(date);
                        }
                        else if (paramNameVale[0] == "path")
                            cookie.Path = paramNameVale[1];
                    }
                    cookieValues[0] = cookieValues[0].Trim();

                    cookie.Name = cookieValues[0].Split(new char[] { '=' })[0];
                    cookie.Value = cookieValues[0].Split(new char[] { '=' })[1];
                    cookie.Domain = BaseUrlHelper.BaseUrl.Host; 

                    if (CookieContainer == null)
                        CookieContainer = new CookieContainer();

                    CookieContainer.Add(cookie);
                }
            }
        }

        [DllImport("wininet.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern bool  InternetSetCookieEx(string lpszUrlName, string lpszCookieName, string lpszCookieData, Int32 dwFlags, IntPtr lpReserved);

        [DllImport("wininet.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern bool InternetSetCookie(string lpszUrlName, string lpszCookieName, string lpszCookieData);

        private const Int32 InternetCookieHttpOnly = 0x2000;

        public static void cacheCookie(string url, string name, string cookieData)
        {
            if (!InternetSetCookie(url, name, cookieData))
            {
                InternetSetCookieEx(url, name, cookieData, InternetCookieHttpOnly, IntPtr.Zero);
            }
        }

        [DllImport("wininet.dll", SetLastError = true)]
        public static extern bool InternetGetCookieEx(
            string url,
            string cookieName,
            StringBuilder cookieData,
            ref int size,
            Int32 dwFlags,
            IntPtr lpReserved);

        [DllImport("wininet.dll", SetLastError = true)]
        public static extern bool InternetGetCookie(
            string url,
            string cookieName,
            StringBuilder cookieData,
            ref int size);

        public static CookieContainer GetUriCookieContainer()
        {
            CookieContainer cookies = null;

            int datasize = 8192 * 16;
            StringBuilder cookieData = new StringBuilder(datasize);

            if (!InternetGetCookie(BaseUrlHelper.BaseUrl.ToString(), null, cookieData, ref datasize))
            {
                if (datasize < 0)
                    return null;

                cookieData = new StringBuilder(datasize);

                InternetGetCookie(BaseUrlHelper.BaseUrl.ToString(), null, cookieData, ref datasize);
            }

            if (cookieData.Length > 0)
            {
                cookies = new CookieContainer();
                cookies.SetCookies(BaseUrlHelper.BaseUrl, cookieData.ToString());
            }
            
            datasize = 8192 * 16;
            cookieData.EnsureCapacity(datasize);

            if (!InternetGetCookieEx(BaseUrlHelper.BaseUrl.ToString(), null, cookieData, ref datasize, InternetCookieHttpOnly, IntPtr.Zero))
            {
                if (datasize < 0)
                    return null;

                if (!InternetGetCookieEx(BaseUrlHelper.BaseUrl.ToString(), null, cookieData, ref datasize, InternetCookieHttpOnly, IntPtr.Zero))
                    return null;
            }
            if (cookieData.Length > 0)
            {
                if (cookies == null)
                    cookies = new CookieContainer();

                String[] cookiesArray = cookieData.ToString().Split(';');
                foreach (String cookie in cookiesArray)
                {
                    cookies.SetCookies(BaseUrlHelper.BaseUrl, cookie);
                }

                return cookies;
            }
            return null;
        }
    }    
}
