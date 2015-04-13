using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;

namespace CommonDataHelper.GlobalHelper
{
    public class SageJsonSerializer : JavaScriptSerializer 
    {
        private const int MIN_SERIALIZATION_STRING_LENGTH = 20000000;

        public SageJsonSerializer() : base()
        {
            MaxJsonLength = Math.Max(MIN_SERIALIZATION_STRING_LENGTH, MaxJsonLength);
        }
    }
}
