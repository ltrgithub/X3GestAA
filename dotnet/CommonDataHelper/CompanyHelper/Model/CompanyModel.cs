using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.CompanyHelper.Model
{
    public class CompanyModel
    {
        [JsonProperty("CPYNAM")]
        public String cpynam;

        [JsonProperty("CPY")]
        public String cpy;
    }
}
