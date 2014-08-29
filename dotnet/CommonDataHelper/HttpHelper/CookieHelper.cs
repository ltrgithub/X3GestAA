using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Text.RegularExpressions;

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

        private static void fixCookies(HttpWebRequest request, HttpWebResponse response)
        {
            for (int i = 0; i < response.Headers.Count; i++)
            {
                string name = response.Headers.GetKey(i);
                if (name != "Set-Cookie")
                    continue;
                string value = response.Headers.Get(i);
                foreach (var singleCookie in value.Split(','))
                {
                    Match match = Regex.Match(singleCookie, "(.+?)=(.+?);");
                    if (match.Captures.Count == 0)
                        continue;
                    response.Cookies.Add(
                        new Cookie(
                            match.Groups[1].ToString(),
                            match.Groups[2].ToString(),
                            "/",
                            request.Host.Split(':')[0]));
                }
            }
        }
    }
}
