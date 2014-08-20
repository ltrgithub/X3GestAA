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

        public static void InitialiseCookies()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }

            CookieContainer = new CookieContainer();
            Uri mainUri = new Uri(baseUrl, "syracuse-main/html/main.html");

            HttpStatusCode statusCode;
            string test = new WebHelper().getServerJson(mainUri.ToString(), out statusCode);
        }

        private static Boolean _cookiesSet = false;
        public static void setCookies(HttpWebRequest request, HttpWebResponse response)
        {
            if (_cookiesSet == false)
            {
                fixCookies(request, response);
                CookieCollection cookieCollection = response.Cookies;
                
                Uri baseUrl = BaseUrlHelper.BaseUrl;
                if (baseUrl == null)
                {
                    return;
                }

                CookieContainer.Add(baseUrl, cookieCollection);

                _cookiesSet = true;
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
